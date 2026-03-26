import React, { useEffect, useState } from "react";
import { historyApi } from "@/shared/api-client";

interface SubmissionItem {
  id: string;
  page_url: string;
  page_title?: string;
  submitted_at: string;
  fields_snapshot: Array<{
    field_label: string;
    category: string;
    filled_content: string;
    char_count: number;
  }>;
  companies?: { company_name: string };
}

export function HistoryView() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await historyApi.list();
      setSubmissions((data as { submissions: SubmissionItem[] }).submissions);
    } catch {
      // Not authenticated
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p style={{ fontSize: "13px", color: "#6b7280" }}>読み込み中...</p>;
  }

  return (
    <div>
      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
        提出履歴 ({submissions.length}件)
      </h3>

      {submissions.map((sub) => (
        <div
          key={sub.id}
          style={{
            background: "white",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "8px",
            border: "1px solid #e5e7eb",
            cursor: "pointer",
          }}
          onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", fontWeight: 500 }}>
              {sub.companies?.company_name || sub.page_title || "不明"}
            </span>
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>
              {new Date(sub.submitted_at).toLocaleDateString("ja-JP")}
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
            {sub.fields_snapshot.length}フィールド入力
          </div>

          {expandedId === sub.id && (
            <div style={{ marginTop: "8px", borderTop: "1px solid #e5e7eb", paddingTop: "8px" }}>
              {sub.fields_snapshot.map((field, i) => (
                <div key={i} style={{ marginBottom: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 500, color: "#4f46e5" }}>
                    {field.field_label} ({field.char_count}字)
                  </div>
                  <div style={{ fontSize: "11px", color: "#374151", lineHeight: 1.4, marginTop: "2px" }}>
                    {field.filled_content.slice(0, 100)}
                    {field.filled_content.length > 100 ? "..." : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {submissions.length === 0 && (
        <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", padding: "20px" }}>
          まだ提出履歴がありません
        </p>
      )}
    </div>
  );
}
