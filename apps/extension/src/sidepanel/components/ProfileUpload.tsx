import React, { useState, useRef } from "react";
import { profileApi } from "@/shared/api-client";

export function ProfileUpload() {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "txt"].includes(ext ?? "")) {
      setStatus("対応形式: PDF, Word (.docx), テキスト (.txt)");
      return;
    }

    setUploading(true);
    setStatus("解析中...");

    try {
      await profileApi.uploadFile(file);
      setStatus("プロフィールを更新しました");
    } catch (err) {
      setStatus(`エラー: ${err instanceof Error ? err.message : "アップロード失敗"}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
        ファイルアップロード
      </h3>
      <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
        履歴書・ES・自己紹介文をアップロードして、プロフィールを自動生成します
      </p>
      <label
        style={{
          display: "block",
          padding: "24px 16px",
          border: "2px dashed #d1d5db",
          borderRadius: "8px",
          textAlign: "center",
          cursor: uploading ? "wait" : "pointer",
          background: "white",
          fontSize: "13px",
          color: "#6b7280",
          opacity: uploading ? 0.5 : 1,
        }}
      >
        {uploading ? "解析中..." : "クリックしてファイルを選択\n(PDF / Word / テキスト)"}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleUpload}
          disabled={uploading}
          style={{ display: "none" }}
        />
      </label>
      {status && (
        <p style={{ fontSize: "12px", marginTop: "8px", color: status.startsWith("エラー") ? "#ef4444" : "#22c55e" }}>
          {status}
        </p>
      )}
    </div>
  );
}
