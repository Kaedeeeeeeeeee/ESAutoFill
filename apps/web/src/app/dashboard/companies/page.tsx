"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

async function apiFetch(path: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
  });
}

const STATUS_COLORS: Record<string, string> = {
  "未応募": "bg-gray-100 text-gray-600",
  "ES提出済": "bg-blue-100 text-blue-700",
  "一次面接": "bg-purple-100 text-purple-700",
  "二次面接": "bg-purple-100 text-purple-700",
  "最終面接": "bg-yellow-100 text-yellow-700",
  "内定": "bg-green-100 text-green-700",
  "不合格": "bg-red-100 text-red-600",
  "辞退": "bg-gray-100 text-gray-500",
};

interface Company {
  id: string;
  company_name: string;
  industry?: string;
  senkou_status: string;
  shiboudouki?: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIndustry, setNewIndustry] = useState("");

  useEffect(() => { loadCompanies(); }, []);

  const loadCompanies = async () => {
    const res = await apiFetch("/api/company");
    if (res.ok) {
      const data = await res.json();
      setCompanies(data.companies);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await apiFetch("/api/company", {
      method: "POST",
      body: JSON.stringify({ company_name: newName, industry: newIndustry || undefined }),
    });
    setNewName("");
    setNewIndustry("");
    setShowAdd(false);
    loadCompanies();
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/company?id=${id}`, { method: "DELETE" });
    loadCompanies();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await apiFetch("/api/company", {
      method: "PUT",
      body: JSON.stringify({ id, senkou_status: status }),
    });
    loadCompanies();
  };

  if (loading) return <div className="text-gray-500">読み込み中...</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">企業管理</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          + 企業を追加
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="企業名（必須）"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <input
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              placeholder="業界（任意）"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">キャンセル</button>
            <button onClick={handleAdd} className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">保存</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {companies.map((company) => (
          <div key={company.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{company.company_name}</h3>
              <div className="flex items-center gap-2">
                <select
                  value={company.senkou_status}
                  onChange={(e) => handleStatusChange(company.id, e.target.value)}
                  className={`text-xs px-2 py-1 rounded-full font-medium border-0 ${STATUS_COLORS[company.senkou_status] || "bg-gray-100"}`}
                >
                  {Object.keys(STATUS_COLORS).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleDelete(company.id)}
                  className="text-gray-300 hover:text-red-500 transition text-lg"
                  title="削除"
                >
                  &times;
                </button>
              </div>
            </div>
            {company.industry && <p className="text-xs text-gray-500">{company.industry}</p>}
            {company.shiboudouki && (
              <p className="text-xs text-green-600 mt-1">志望動機あり</p>
            )}
          </div>
        ))}

        {companies.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-12">
            「+ 企業を追加」ボタンから志望企業を登録してください
          </p>
        )}
      </div>
    </div>
  );
}
