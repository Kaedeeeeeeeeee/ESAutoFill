import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ProfileUpload } from "./components/ProfileUpload";
import { ProfileViewer } from "./components/ProfileViewer";
import { ChatFill } from "./components/ChatFill";
import { CompanyList } from "./components/CompanyList";
import { HistoryView } from "./components/HistoryView";
import { Settings } from "./components/Settings";

type Tab = "profile" | "fill" | "companies" | "history" | "settings";

function SidePanel() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "プロフィール" },
    { id: "fill", label: "自動入力" },
    { id: "companies", label: "企業管理" },
    { id: "history", label: "履歴" },
    { id: "settings", label: "設定" },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          background: "#4f46e5",
          color: "white",
        }}
      >
        <h1 style={{ fontSize: "16px", fontWeight: 600 }}>ES AutoFill</h1>
      </div>

      {/* Tab navigation */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #e5e7eb",
          background: "white",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: "10px 4px",
              border: "none",
              background: activeTab === tab.id ? "#eef2ff" : "transparent",
              borderBottom: activeTab === tab.id ? "2px solid #4f46e5" : "2px solid transparent",
              color: activeTab === tab.id ? "#4f46e5" : "#6b7280",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
        {activeTab === "profile" && (
          <div>
            <ProfileUpload />
            <ProfileViewer />
          </div>
        )}
        {activeTab === "fill" && <ChatFill />}
        {activeTab === "companies" && <CompanyList />}
        {activeTab === "history" && <HistoryView />}
        {activeTab === "settings" && <Settings />}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<SidePanel />);
