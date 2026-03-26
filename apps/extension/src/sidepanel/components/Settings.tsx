import React, { useState } from "react";
import { getAuthToken, clearAuthToken, getApiBaseUrl } from "@/shared/storage";

export function Settings() {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");

  const handleDeleteAll = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    setMessage("");

    try {
      const [baseUrl, token] = await Promise.all([getApiBaseUrl(), getAuthToken()]);

      const response = await fetch(`${baseUrl}/api/profile/delete-all`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setMessage("全てのデータを削除しました");
        setConfirmDelete(false);
      } else {
        setMessage("削除に失敗しました");
      }
    } catch {
      setMessage("エラーが発生しました");
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    await clearAuthToken();
    setMessage("ログアウトしました");
  };

  return (
    <div>
      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px" }}>設定</h3>

      {/* Logout */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "10px",
            background: "#f3f4f6",
            color: "#374151",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          ログアウト
        </button>
      </div>

      {/* Privacy section */}
      <div style={{ marginBottom: "20px" }}>
        <h4 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "#374151" }}>
          プライバシー
        </h4>
        <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px", lineHeight: 1.5 }}>
          個人情報（氏名、メール、電話番号）はAES-256-GCMで暗号化されて保存されています。
        </p>
      </div>

      {/* Delete all data */}
      <div
        style={{
          padding: "12px",
          background: confirmDelete ? "#fef2f2" : "#fff",
          border: `1px solid ${confirmDelete ? "#fecaca" : "#e5e7eb"}`,
          borderRadius: "8px",
        }}
      >
        <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#dc2626", marginBottom: "8px" }}>
          データ削除
        </h4>
        <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px", lineHeight: 1.5 }}>
          プロフィール、経験、企業情報、提出履歴、アップロードファイル全てを完全に削除します。この操作は元に戻せません。
        </p>

        {confirmDelete && (
          <p style={{ fontSize: "12px", color: "#dc2626", fontWeight: 600, marginBottom: "8px" }}>
            本当に全てのデータを削除しますか？
          </p>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          {confirmDelete && (
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                flex: 1,
                padding: "8px",
                background: "#f3f4f6",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              キャンセル
            </button>
          )}
          <button
            onClick={handleDeleteAll}
            disabled={deleting}
            style={{
              flex: 1,
              padding: "8px",
              background: confirmDelete ? "#dc2626" : "#fef2f2",
              color: confirmDelete ? "white" : "#dc2626",
              border: confirmDelete ? "none" : "1px solid #fecaca",
              borderRadius: "6px",
              cursor: deleting ? "wait" : "pointer",
              fontSize: "12px",
              fontWeight: confirmDelete ? 600 : 400,
            }}
          >
            {deleting ? "削除中..." : confirmDelete ? "完全に削除する" : "全てのデータを削除"}
          </button>
        </div>
      </div>

      {message && (
        <p
          style={{
            fontSize: "12px",
            marginTop: "12px",
            color: message.includes("削除しました") || message.includes("ログアウト") ? "#22c55e" : "#dc2626",
            textAlign: "center",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
