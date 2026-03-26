import React, { useState, useEffect, useRef } from "react";
import type { FillPreviewItem } from "@es-autofill/shared";

const API_BASE = "http://localhost:3000";
const SUPABASE_URL = "https://rudqwrfkcldxoxgnuleq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZHF3cmZrY2xkeG94Z251bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODA1MzUsImV4cCI6MjA5MDA1NjUzNX0.BRqqjRykoZOhXNrXTH9TKk1ZCRUMAubCUfoxBto3Tvs";

interface ChatMessage {
  id: string;
  role: "ai" | "user";
  type: "progress" | "question" | "preview" | "text" | "error";
  content: string;
  completedFields?: Array<{ label: string; category: string }>;
  questionContext?: {
    fieldIndex: number;
    category: string;
    fieldLabel: string;
    charLimit: number | null;
    selector: string;
  };
  previewItems?: FillPreviewItem[];
}

let authToken: string | null = null;

async function ensureAuth(): Promise<string> {
  if (authToken) return authToken;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@example.com", password: "testpassword123" }),
  });
  const data = await res.json();
  authToken = data.access_token;
  return authToken!;
}

async function apiCall<T>(path: string, body: unknown): Promise<T> {
  const token = await ensureAuth();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `API error: ${res.status}`);
  }
  return res.json();
}

export function ChatFill() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<ChatMessage | null>(null);
  const [allFills, setAllFills] = useState<FillPreviewItem[]>([]);
  const [isFilled, setIsFilled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for FIELDS_DETECTED from content script via background
  useEffect(() => {
    const listener = (msg: { type: string; payload: unknown }) => {
      if (msg.type === "FIELDS_DETECTED") {
        const data = msg.payload as { fields: unknown[]; url: string };
        runPipeline(data.fields);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const addMessage = (msg: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: `msg-${Date.now()}-${Math.random()}` }]);
  };

  const runPipeline = async (fields: unknown[]) => {
    setIsProcessing(true);
    setMessages([]);
    setAllFills([]);
    setIsFilled(false);
    setPendingQuestion(null);

    const fieldCount = (fields as Array<{ inputType: string }>).length;
    addMessage({
      role: "ai",
      type: "progress",
      content: `${fieldCount}個のフィールドを検出しました。自動入力を開始します...`,
    });

    try {
      // Step 1: Classify
      const classifyRes = await apiCall<{ classifications: Array<Record<string, unknown>> }>(
        "/api/form/classify",
        { fields }
      );

      const esFields = classifyRes.classifications.filter((c) => c.category !== "non_es");
      const nonEsCount = classifyRes.classifications.length - esFields.length;

      addMessage({
        role: "ai",
        type: "progress",
        content: `${esFields.length}個のESフィールドを分類しました${nonEsCount > 0 ? `（${nonEsCount}個は対象外）` : ""}`,
      });

      // Step 2: Generate
      const generateRes = await apiCall<{ fills: Array<Record<string, unknown>> }>(
        "/api/form/generate",
        { classifications: classifyRes.classifications, profileId: "" }
      );

      // Process results
      const completed: Array<{ label: string; category: string }> = [];
      const needsInput: Array<Record<string, unknown>> = [];
      const fillItems: FillPreviewItem[] = [];

      for (const fill of generateRes.fills) {
        const classification = classifyRes.classifications.find(
          (c) => c.index === fill.index
        );
        if (!classification) continue;

        const field = (fields as Array<Record<string, unknown>>).find(
          (f) => f.index === fill.index
        );

        const previewItem: FillPreviewItem = {
          index: fill.index as number,
          category: (fill.category || classification.category) as FillPreviewItem["category"],
          content: fill.content as string,
          charCount: [...(fill.content as string)].length,
          selector: (classification.selector || field?.selector || "") as string,
          source: "generated",
          fieldLabel: (field?.label || (field?.surroundingText as string)?.slice(0, 50) || `フィールド ${(fill.index as number) + 1}`) as string,
          charLimit: (classification.char_limit ?? classification.charLimit ?? null) as number | null,
          edited: false,
        };

        if (fill.needsInput) {
          needsInput.push({ ...fill, ...previewItem });
        } else {
          completed.push({
            label: previewItem.fieldLabel,
            category: previewItem.category,
          });
          fillItems.push(previewItem);
        }
      }

      // Show completed fields
      if (completed.length > 0) {
        // Group by type
        const basicInfo = completed.filter((c) => c.category.startsWith("basic_info"));
        const essays = completed.filter((c) => !c.category.startsWith("basic_info"));

        if (basicInfo.length > 0) {
          addMessage({
            role: "ai",
            type: "progress",
            content: `基本情報 ✓ (${basicInfo.map((c) => c.label).join("、")})`,
            completedFields: basicInfo,
          });
        }

        for (const essay of essays) {
          const item = fillItems.find((f) => f.fieldLabel === essay.label);
          addMessage({
            role: "ai",
            type: "progress",
            content: `${essay.label}${item?.charLimit ? `(${item.charCount}/${item.charLimit}字)` : ""} ✓ 生成済み`,
          });
        }
      }

      setAllFills(fillItems);

      // Ask questions for missing fields
      if (needsInput.length > 0) {
        const first = needsInput[0];
        const questionMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: "ai",
          type: "question",
          content: (first.question as string) || `「${first.fieldLabel}」について教えてください。`,
          questionContext: {
            fieldIndex: first.index as number,
            category: first.category as string,
            fieldLabel: first.fieldLabel as string,
            charLimit: first.charLimit as number | null,
            selector: first.selector as string,
          },
        };
        setMessages((prev) => [...prev, questionMsg]);
        setPendingQuestion(questionMsg);

        // Store remaining questions
        if (needsInput.length > 1) {
          // Will handle next question after user answers
          (window as unknown as Record<string, unknown>).__esAutoFillPendingQuestions = needsInput.slice(1);
        }
      } else {
        // All done — show preview
        showPreview(fillItems);
      }
    } catch (err) {
      addMessage({
        role: "ai",
        type: "error",
        content: `エラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userText = inputText.trim();
    setInputText("");

    addMessage({ role: "user", type: "text", content: userText });

    if (pendingQuestion?.questionContext) {
      setIsProcessing(true);
      const ctx = pendingQuestion.questionContext;

      try {
        addMessage({ role: "ai", type: "progress", content: `「${ctx.fieldLabel}」を生成中...` });

        const result = await apiCall<{ content: string; charCount: number }>(
          "/api/chat",
          {
            fieldCategory: ctx.category,
            fieldLabel: ctx.fieldLabel,
            charLimit: ctx.charLimit,
            userResponse: userText,
          }
        );

        const newFill: FillPreviewItem = {
          index: ctx.fieldIndex,
          category: ctx.category as FillPreviewItem["category"],
          content: result.content,
          charCount: result.charCount,
          selector: ctx.selector,
          source: "generated",
          fieldLabel: ctx.fieldLabel,
          charLimit: ctx.charLimit,
          edited: false,
        };

        setAllFills((prev) => [...prev, newFill]);
        addMessage({
          role: "ai",
          type: "progress",
          content: `${ctx.fieldLabel}${ctx.charLimit ? `(${result.charCount}/${ctx.charLimit}字)` : ""} ✓ 生成済み`,
        });

        setPendingQuestion(null);

        // Check for more pending questions
        const remaining = (window as unknown as Record<string, unknown>).__esAutoFillPendingQuestions as Array<Record<string, unknown>> | undefined;
        if (remaining && remaining.length > 0) {
          const next = remaining.shift();
          (window as unknown as Record<string, unknown>).__esAutoFillPendingQuestions = remaining;

          const questionMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "ai",
            type: "question",
            content: (next!.question as string) || `「${next!.fieldLabel}」について教えてください。`,
            questionContext: {
              fieldIndex: next!.index as number,
              category: next!.category as string,
              fieldLabel: next!.fieldLabel as string,
              charLimit: next!.charLimit as number | null,
              selector: next!.selector as string,
            },
          };
          setMessages((prev) => [...prev, questionMsg]);
          setPendingQuestion(questionMsg);
        } else {
          // All questions answered — show preview
          showPreview([...allFills, newFill]);
        }
      } catch (err) {
        addMessage({
          role: "ai",
          type: "error",
          content: `生成に失敗しました: ${err instanceof Error ? err.message : "エラー"}`,
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const showPreview = (items: FillPreviewItem[]) => {
    addMessage({
      role: "ai",
      type: "preview",
      content: `全${items.length}フィールドの入力準備が完了しました。`,
      previewItems: items,
    });
  };

  const handleFillAll = async () => {
    // Send EXECUTE_FILL to content script via background
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: "EXECUTE_FILL",
          payload: allFills,
        });
      }
      setIsFilled(true);
      addMessage({
        role: "ai",
        type: "progress",
        content: "全てのフィールドに入力しました ✓",
      });
    } catch (err) {
      addMessage({
        role: "ai",
        type: "error",
        content: `入力に失敗しました: ${err instanceof Error ? err.message : "エラー"}`,
      });
    }
  };

  const handleStartScan = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "SCAN_PAGE", payload: null });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 110px)" }}>
      {/* Messages area */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 0" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📝</div>
            <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#374151" }}>
              ESフォームを自動入力
            </p>
            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px", lineHeight: 1.5 }}>
              ESフォームのあるページで下のボタンを押すと、AIが自動でフィールドを検出して入力します。
            </p>
            <button
              onClick={handleStartScan}
              style={{
                padding: "10px 24px",
                background: "#4f46e5",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              このページのESを検出
            </button>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              padding: "6px 0",
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "90%",
                padding: "8px 12px",
                borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                background:
                  msg.type === "error"
                    ? "#fef2f2"
                    : msg.type === "question"
                    ? "#eef2ff"
                    : msg.role === "user"
                    ? "#4f46e5"
                    : "#f3f4f6",
                color:
                  msg.type === "error"
                    ? "#dc2626"
                    : msg.role === "user"
                    ? "white"
                    : "#1f2937",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              {msg.type === "question" && (
                <div style={{ fontSize: "11px", color: "#4f46e5", fontWeight: 600, marginBottom: "4px" }}>
                  💬 質問
                </div>
              )}
              {msg.content}

              {/* Preview with fill button */}
              {msg.type === "preview" && msg.previewItems && !isFilled && (
                <div style={{ marginTop: "10px" }}>
                  {msg.previewItems.map((item) => (
                    <div
                      key={item.index}
                      style={{
                        background: "white",
                        borderRadius: "6px",
                        padding: "6px 8px",
                        marginBottom: "4px",
                        border: "1px solid #e5e7eb",
                        fontSize: "11px",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "#4f46e5" }}>{item.fieldLabel}</span>
                      <span style={{ color: "#9ca3af", marginLeft: "4px" }}>
                        {item.charCount}{item.charLimit ? `/${item.charLimit}` : ""}字
                      </span>
                      <div style={{ color: "#6b7280", marginTop: "2px" }}>
                        {item.content.slice(0, 80)}{item.content.length > 80 ? "..." : ""}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleFillAll}
                    style={{
                      width: "100%",
                      padding: "8px",
                      marginTop: "8px",
                      background: "#4f46e5",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    全て入力する
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div style={{ padding: "6px 0", display: "flex" }}>
            <div style={{ padding: "8px 12px", background: "#f3f4f6", borderRadius: "12px 12px 12px 4px", fontSize: "13px", color: "#6b7280" }}>
              <span style={{ animation: "pulse 1.5s infinite" }}>考え中...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{ borderTop: "1px solid #e5e7eb", padding: "8px 0 0", display: "flex", gap: "8px" }}>
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
          placeholder={pendingQuestion ? "回答を入力..." : "メッセージを入力..."}
          disabled={isProcessing}
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "13px",
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputText.trim() || isProcessing}
          style={{
            padding: "10px 16px",
            background: inputText.trim() ? "#4f46e5" : "#e5e7eb",
            color: inputText.trim() ? "white" : "#9ca3af",
            border: "none",
            borderRadius: "8px",
            cursor: inputText.trim() ? "pointer" : "default",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          送信
        </button>
      </div>
    </div>
  );
}
