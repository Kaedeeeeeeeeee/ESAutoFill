import React from "react";
import { createRoot } from "react-dom/client";
import { ChatFill } from "./components/ChatFill";

function SidePanel() {
  const openDashboard = () => {
    chrome.tabs.create({ url: "http://localhost:3000/dashboard" });
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid #e5e7eb",
          background: "#4f46e5",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: "15px", fontWeight: 600 }}>ES AutoFill</h1>
        <button
          onClick={openDashboard}
          style={{
            padding: "4px 10px",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          ダッシュボード
        </button>
      </div>

      {/* Chat fill - the only content */}
      <div style={{ flex: 1, overflow: "hidden", padding: "0 12px 12px" }}>
        <ChatFill />
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<SidePanel />);
