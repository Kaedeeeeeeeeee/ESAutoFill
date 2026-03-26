import React, { useEffect, useState } from "react";
import { companyApi } from "@/shared/api-client";
import { CompanyDetail } from "./CompanyDetail";

export interface CompanyItem {
  id: string;
  company_name: string;
  company_url?: string;
  industry?: string;
  senkou_status: string;
  shiboudouki?: string;
  user_keywords?: string[];
  mission_statement?: string;
  business_areas?: string[];
  company_values?: string[];
  recent_news?: Array<{ title: string; date: string; summary: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  "未応募": "#9ca3af",
  "ES提出済": "#3b82f6",
  "一次面接": "#8b5cf6",
  "二次面接": "#8b5cf6",
  "最終面接": "#f59e0b",
  "内定": "#22c55e",
  "不合格": "#ef4444",
  "辞退": "#6b7280",
};

export const SENKOU_STATUSES = [
  "未応募", "ES提出済", "一次面接", "二次面接", "最終面接", "内定", "不合格", "辞退",
];

export function CompanyList() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await companyApi.list();
      setCompanies(data.companies as CompanyItem[]);
    } catch {
      // Not authenticated
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await companyApi.create({
        company_name: newName.trim(),
        company_url: newUrl.trim() || undefined,
      });
      setNewName("");
      setNewUrl("");
      setShowAdd(false);
      loadCompanies();
    } catch {
      // Error
    }
  };

  const handleDelete = async (id: string) => {
    await companyApi.delete(id);
    if (selectedId === id) setSelectedId(null);
    loadCompanies();
  };

  const handleUpdate = async () => {
    loadCompanies();
  };

  // Show detail view
  if (selectedId) {
    const company = companies.find((c) => c.id === selectedId);
    if (company) {
      return (
        <CompanyDetail
          company={company}
          onBack={() => setSelectedId(null)}
          onUpdate={handleUpdate}
        />
      );
    }
  }

  if (loading) {
    return <p style={{ fontSize: "13px", color: "#6b7280" }}>読み込み中...</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600 }}>企業一覧 ({companies.length})</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            padding: "4px 12px",
            background: "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          + 追加
        </button>
      </div>

      {showAdd && (
        <div style={{ marginBottom: "12px", background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="企業名（必須）"
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontSize: "13px",
              marginBottom: "8px",
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="企業URL（任意）"
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontSize: "13px",
              marginBottom: "8px",
            }}
          />
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowAdd(false)}
              style={{ padding: "6px 12px", background: "#f3f4f6", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
            >
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              style={{ padding: "6px 16px", background: "#4f46e5", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
            >
              保存
            </button>
          </div>
        </div>
      )}

      {companies.map((company) => (
        <div
          key={company.id}
          style={{
            background: "white",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "8px",
            border: "1px solid #e5e7eb",
            cursor: "pointer",
          }}
          onClick={() => setSelectedId(company.id)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 500 }}>{company.company_name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  background: `${STATUS_COLORS[company.senkou_status] || "#9ca3af"}20`,
                  color: STATUS_COLORS[company.senkou_status] || "#9ca3af",
                  fontWeight: 500,
                }}
              >
                {company.senkou_status}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(company.id); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: "14px" }}
                title="削除"
              >
                &times;
              </button>
            </div>
          </div>
          {company.industry && (
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>{company.industry}</div>
          )}
          {company.shiboudouki && (
            <div style={{ fontSize: "11px", color: "#22c55e", marginTop: "4px" }}>志望動機あり</div>
          )}
        </div>
      ))}

      {companies.length === 0 && !showAdd && (
        <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", padding: "20px" }}>
          企業を追加して志望動機を管理しましょう
        </p>
      )}
    </div>
  );
}
