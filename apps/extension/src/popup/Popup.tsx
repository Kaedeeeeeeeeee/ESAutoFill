import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { getAuthToken, setAuthToken, clearAuthToken } from "@/shared/storage";
import { sendToBackground } from "@/shared/messages";

function Popup() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthToken().then((token) => {
      setIsLoggedIn(!!token);
      setLoading(false);
    });
  }, []);

  const handleLogin = () => {
    // TODO: Implement Supabase OAuth flow
    // For now, open the web app login page
    chrome.tabs.create({ url: "http://localhost:3000" });
  };

  const handleLogout = async () => {
    await clearAuthToken();
    setIsLoggedIn(false);
  };

  const handleOpenSidePanel = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
    window.close();
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px" }}>読み込み中...</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: "18px", marginBottom: "8px" }}>
        ES AutoFill
      </h1>
      <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>
        エントリーシート自動入力
      </p>

      {isLoggedIn ? (
        <div>
          <button
            onClick={handleOpenSidePanel}
            style={{
              width: "100%",
              padding: "10px",
              background: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              marginBottom: "8px",
            }}
          >
            サイドパネルを開く
          </button>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "8px",
              background: "transparent",
              color: "#666",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            ログアウト
          </button>
        </div>
      ) : (
        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: "10px",
            background: "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          ログイン
        </button>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<Popup />);
