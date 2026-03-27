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
  /** For batch questions: all missing fields */
  missingFields?: Array<{
    fieldIndex: number;
    category: string;
    fieldLabel: string;
    charLimit: number | null;
    selector: string;
    options?: Array<{ value: string; text: string }>;
  }>;
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

/** Current AbortController — used to cancel in-flight requests */
let currentAbortController: AbortController | null = null;

async function apiCall<T>(path: string, body: unknown): Promise<T> {
  const token = await ensureAuth();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: currentAbortController?.signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `API error: ${res.status}`);
  }
  return res.json();
}

/** Cancel all in-flight API requests */
function abortAllRequests() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
}

export function ChatFill() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingMissingFields, setPendingMissingFields] = useState<ChatMessage["missingFields"] | null>(null);
  const [allFills, setAllFills] = useState<FillPreviewItem[]>([]);
  const [isFilled, setIsFilled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Warn user before closing side panel if processing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing) {
        e.preventDefault();
        // Note: Chrome side panels support beforeunload confirmation
        return "AIが処理中です。閉じると処理が中断されます。";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isProcessing]);

  // Cleanup on unmount: abort any in-flight requests
  useEffect(() => {
    return () => {
      abortAllRequests();
    };
  }, []);

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
    abortAllRequests();
    currentAbortController = new AbortController();

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

      // Ask about ALL missing fields at once
      if (needsInput.length > 0) {
        const missingFieldsList = needsInput.map((f) => ({
          fieldIndex: f.index as number,
          category: f.category as string,
          fieldLabel: f.fieldLabel as string,
          charLimit: f.charLimit as number | null,
          selector: f.selector as string,
          options: f.options as Array<{ value: string; text: string }> | undefined,
        }));

        const bulletPoints = missingFieldsList
          .map((f) => `  ・${f.fieldLabel}`)
          .join("\n");

        addMessage({
          role: "ai",
          type: "question",
          content: `以下の${missingFieldsList.length}項目の情報が不足しています。まとめて教えてください：\n\n${bulletPoints}`,
          missingFields: missingFieldsList,
        });

        setPendingMissingFields(missingFieldsList);
      } else {
        // All done — show preview
        showPreview(fillItems);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        addMessage({ role: "ai", type: "progress", content: "処理を中断しました" });
      } else {
        addMessage({
          role: "ai",
          type: "error",
          content: `エラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`,
        });
      }
    } finally {
      setIsProcessing(false);
      currentAbortController = null;
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userText = inputText.trim();
    setInputText("");

    addMessage({ role: "user", type: "text", content: userText });

    if (pendingMissingFields && pendingMissingFields.length > 0) {
      abortAllRequests();
      currentAbortController = new AbortController();
      setIsProcessing(true);

      try {
        addMessage({
          role: "ai",
          type: "progress",
          content: `${pendingMissingFields.length}項目を一括生成中...`,
        });

        const result = await apiCall<{
          fills: Array<{ fieldIndex: number; content: string; charCount: number }>;
        }>("/api/chat", {
          userResponse: userText,
          fields: pendingMissingFields.map((f) => ({
            fieldIndex: f.fieldIndex,
            fieldCategory: f.category,
            fieldLabel: f.fieldLabel,
            charLimit: f.charLimit,
            options: f.options,
          })),
        });

        const newFills: FillPreviewItem[] = result.fills
          .filter((fill) => fill.content)
          .map((fill) => {
            const field = pendingMissingFields.find(
              (f) => f.fieldIndex === fill.fieldIndex
            );
            return {
              index: fill.fieldIndex,
              category: (field?.category || "free_text") as FillPreviewItem["category"],
              content: fill.content,
              charCount: fill.charCount,
              selector: field?.selector || "",
              source: "generated" as const,
              fieldLabel: field?.fieldLabel || "",
              charLimit: field?.charLimit ?? null,
              edited: false,
            };
          });

        const updatedFills = [...allFills, ...newFills];
        setAllFills(updatedFills);

        addMessage({
          role: "ai",
          type: "progress",
          content: `${newFills.length}項目を生成しました ✓`,
        });

        setPendingMissingFields(null);
        showPreview(updatedFills);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          addMessage({ role: "ai", type: "progress", content: "処理を中断しました" });
        } else {
          addMessage({
            role: "ai",
            type: "error",
            content: `生成に失敗しました: ${err instanceof Error ? err.message : "エラー"}`,
          });
        }
      } finally {
        setIsProcessing(false);
        currentAbortController = null;
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
            <div style={{ marginBottom: "12px" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
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
                  質問
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
            <div style={{
              padding: "10px 14px",
              background: "#f3f4f6",
              borderRadius: "12px 12px 12px 4px",
              fontSize: "13px",
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <style>{`
                @keyframes thinkingBounce {
                  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
                  40% { transform: scale(1); opacity: 1; }
                }
              `}</style>
              <span style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                {[0, 0.2, 0.4].map((delay) => (
                  <span
                    key={delay}
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#4f46e5",
                      animation: `thinkingBounce 1.4s ease-in-out ${delay}s infinite`,
                    }}
                  />
                ))}
              </span>
              <span>考え中</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area — Claude-style */}
      <div style={{
        padding: "8px 0 4px",
        marginTop: "100px",
      }}>
        <div style={{
          border: "1px solid #d1d5db",
          borderRadius: "16px",
          padding: "10px 12px 8px",
          background: "white",
          transition: "border-color 0.2s",
        }}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={pendingMissingFields ? "まとめて回答を入力..." : "メッセージを入力..."}
            disabled={isProcessing}
            rows={1}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: "13px",
              fontFamily: "inherit",
              lineHeight: 1.5,
              color: "#1f2937",
              background: "transparent",
              minHeight: "20px",
              maxHeight: "120px",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            marginTop: "6px",
          }}>
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isProcessing}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                border: "none",
                background: inputText.trim() ? "#4f46e5" : "#e5e7eb",
                color: "white",
                cursor: inputText.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: "10px", color: "#9ca3af", marginTop: "4px" }}>
          AIが生成した内容は必ずご自身で確認してください
        </p>
      </div>
    </div>
  );
}
