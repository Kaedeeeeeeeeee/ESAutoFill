"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

async function apiFetch(path: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

interface Submission {
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

export default function HistoryPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    const res = await apiFetch("/api/history");
    if (res.ok) {
      const data = await res.json();
      setSubmissions(data.submissions);
    }
    setLoading(false);
  };

  if (loading) return <div className="text-gray-500">読み込み中...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">提出履歴</h1>

      <div className="space-y-3">
        {submissions.map((sub) => (
          <div
            key={sub.id}
            className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:border-indigo-200 transition"
            onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{sub.companies?.company_name || sub.page_title || "不明"}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {sub.fields_snapshot.length}フィールド入力 | {new Date(sub.submitted_at).toLocaleDateString("ja-JP")}
                </div>
              </div>
              <span className="text-gray-400 text-sm">{expandedId === sub.id ? "−" : "+"}</span>
            </div>

            {expandedId === sub.id && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                {sub.fields_snapshot.map((field, i) => (
                  <div key={i}>
                    <div className="text-xs font-semibold text-indigo-600 mb-1">
                      {field.field_label} ({field.char_count}字)
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {field.filled_content}
                    </p>
                  </div>
                ))}
                <div className="text-xs text-gray-400 pt-2">
                  URL: {sub.page_url}
                </div>
              </div>
            )}
          </div>
        ))}

        {submissions.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-12">
            ESを自動入力すると、ここに履歴が表示されます
          </p>
        )}
      </div>
    </div>
  );
}
