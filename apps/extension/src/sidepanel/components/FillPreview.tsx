import React, { useState, useEffect } from "react";
import { sendToBackground } from "@/shared/messages";
import type { FillPreviewItem } from "@es-autofill/shared";

type PipelineStep = "idle" | "scanning" | "classifying" | "generating" | "ready" | "filled" | "error";

const STEP_LABELS: Record<PipelineStep, string> = {
  idle: "",
  scanning: "フォームをスキャン中...",
  classifying: "フィールドを分類中...",
  generating: "内容を生成中...",
  ready: "",
  filled: "入力完了",
  error: "",
};

export function FillPreview() {
  const [step, setStep] = useState<PipelineStep>("idle");
  const [previews, setPreviews] = useState<FillPreviewItem[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldCount, setFieldCount] = useState(0);

  // Listen for pipeline status messages from background
  useEffect(() => {
    const listener = (message: { type: string; payload: unknown }) => {
      switch (message.type) {
        case "SCAN_STARTED":
          setStep("scanning");
          setErrorMsg("");
          break;
        case "FIELDS_DETECTED": {
          const data = message.payload as { fieldCount: number };
          setFieldCount(data.fieldCount);
          break;
        }
        case "CLASSIFY_STARTED":
          setStep("classifying");
          break;
        case "GENERATE_STARTED":
          setStep("generating");
          break;
        case "GENERATE_RESULT": {
          const items = message.payload as FillPreviewItem[];
          setPreviews(items);
          setStep(items.length > 0 ? "ready" : "idle");
          if (items.length === 0) {
            setErrorMsg("ESフィールドが検出されませんでした");
          }
          break;
        }
        case "FILL_COMPLETE":
          setStep("filled");
          break;
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleScan = async () => {
    setStep("scanning");
    setErrorMsg("");
    setPreviews([]);

    try {
      await sendToBackground("SCAN_AND_FILL", {});
    } catch (err) {
      setStep("error");
      setErrorMsg(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  const handleFillAll = async () => {
    try {
      await sendToBackground("EXECUTE_FILL", previews);
      setStep("filled");

      // Save submission history
      await sendToBackground("SAVE_SUBMISSION", {
        pageUrl: window.location.href,
        pageTitle: document.title,
        fieldsSnapshot: previews.map((p) => ({
          field_label: p.fieldLabel,
          category: p.category,
          filled_content: p.content,
          char_count: [...p.content].length,
        })),
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "入力に失敗しました");
    }
  };

  const handleEditContent = (index: number, newContent: string) => {
    setPreviews((prev) =>
      prev.map((p) =>
        p.index === index
          ? { ...p, content: newContent, charCount: [...newContent].length, edited: true }
          : p
      )
    );
  };

  const isLoading = step === "scanning" || step === "classifying" || step === "generating";

  return (
    <div>
      {/* Scan button */}
      <button
        onClick={handleScan}
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "12px",
          background: isLoading ? "#a5b4fc" : "#4f46e5",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: isLoading ? "wait" : "pointer",
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "12px",
        }}
      >
        {isLoading ? STEP_LABELS[step] : "このページのESを自動入力"}
      </button>

      {/* Progress indicator */}
      {isLoading && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
            {(["scanning", "classifying", "generating"] as const).map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: "3px",
                  borderRadius: "2px",
                  background:
                    step === s ? "#4f46e5" :
                    (["scanning", "classifying", "generating"].indexOf(step) >
                     ["scanning", "classifying", "generating"].indexOf(s))
                      ? "#22c55e" : "#e5e7eb",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
          {fieldCount > 0 && step !== "scanning" && (
            <p style={{ fontSize: "11px", color: "#6b7280" }}>
              {fieldCount} フィールドを検出
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div
          style={{
            padding: "10px 12px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#dc2626",
            marginBottom: "12px",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Success */}
      {step === "filled" && (
        <div
          style={{
            padding: "10px 12px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#15803d",
            marginBottom: "12px",
          }}
        >
          全てのフィールドに入力しました ({previews.length}件)
        </div>
      )}

      {/* Preview list */}
      {previews.length > 0 && step !== "filled" && (
        <div>
          <h3 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px", color: "#374151" }}>
            入力プレビュー ({previews.length}件)
          </h3>

          {previews.map((preview) => {
            const isOverLimit = preview.charLimit != null && preview.charCount > preview.charLimit;

            return (
              <div
                key={preview.index}
                style={{
                  background: "white",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "8px",
                  border: `1px solid ${isOverLimit ? "#fecaca" : "#e5e7eb"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#4f46e5" }}>
                    {preview.fieldLabel}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: isOverLimit ? "#ef4444" : "#9ca3af",
                      fontWeight: isOverLimit ? 600 : 400,
                    }}
                  >
                    {preview.charCount}{preview.charLimit ? `/${preview.charLimit}` : ""}字
                  </span>
                </div>
                <textarea
                  value={preview.content}
                  onChange={(e) => handleEditContent(preview.index, e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: "60px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    padding: "8px",
                    fontSize: "12px",
                    lineHeight: 1.6,
                    resize: "vertical",
                    fontFamily: "inherit",
                    color: "#1f2937",
                  }}
                />
                {preview.edited && (
                  <span style={{ fontSize: "10px", color: "#f59e0b" }}>編集済み</span>
                )}
              </div>
            );
          })}

          <button
            onClick={handleFillAll}
            style={{
              width: "100%",
              padding: "12px",
              background: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
              marginTop: "4px",
            }}
          >
            全て入力する
          </button>
        </div>
      )}
    </div>
  );
}
