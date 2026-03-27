"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
  });
}

interface Profile {
  full_name?: string;
  furigana?: string;
  email?: string;
  phone?: string;
  university?: string;
  faculty?: string;
  department?: string;
  graduation_year?: number;
  self_pr?: string;
  gakuchika?: string;
  strengths?: Array<{ title: string; description: string }>;
  weaknesses?: Array<{ title: string; description: string }>;
}

interface Experience {
  id: string;
  category: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  learnings?: string;
  tags: string[];
  variants: Record<string, string>;
}

const EXPERIENCE_CATEGORIES = [
  { value: "gakuchika", label: "ガクチカ" },
  { value: "leadership", label: "リーダーシップ" },
  { value: "teamwork", label: "チームワーク" },
  { value: "challenge", label: "困難を乗り越えた経験" },
  { value: "failure", label: "失敗経験" },
  { value: "strength_evidence", label: "強みの根拠" },
  { value: "part_time", label: "アルバイト" },
  { value: "club", label: "部活・サークル" },
  { value: "research", label: "研究" },
  { value: "volunteer", label: "ボランティア" },
  { value: "internship", label: "インターン" },
  { value: "other", label: "その他" },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showExpForm, setShowExpForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Editable profile form state
  const [form, setForm] = useState({
    full_name: "", furigana: "", email: "", phone: "",
    university: "", faculty: "", department: "",
    graduation_year: "",
    self_pr: "", gakuchika: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // New experience form state
  const [expForm, setExpForm] = useState({
    category: "gakuchika", title: "",
    situation: "", task: "", action: "", result: "", learnings: "",
    tags: "",
  });
  const [addingExp, setAddingExp] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const res = await apiFetch("/api/profile");
    if (res.ok) {
      const data = await res.json();
      const p = data.profile;
      setProfile(p);
      setExperiences(data.experiences ?? []);
      if (p) {
        setForm({
          full_name: p.full_name ?? "",
          furigana: p.furigana ?? "",
          email: p.email ?? "",
          phone: p.phone ?? "",
          university: p.university ?? "",
          faculty: p.faculty ?? "",
          department: p.department ?? "",
          graduation_year: p.graduation_year ? String(p.graduation_year) : "",
          self_pr: p.self_pr ?? "",
          gakuchika: p.gakuchika ?? "",
        });
      }
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("解析中...");
    const token = await getToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/api/profile/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    setUploadMsg(res.ok ? "プロフィールを更新しました" : "アップロードに失敗しました");
    if (res.ok) loadProfile();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg("");
    const payload: Record<string, unknown> = { ...form };
    if (form.graduation_year) payload.graduation_year = parseInt(form.graduation_year, 10);
    else delete payload.graduation_year;

    const res = await apiFetch("/api/profile", { method: "PUT", body: JSON.stringify(payload) });
    setSaveMsg(res.ok ? "保存しました" : "保存に失敗しました");
    if (res.ok) loadProfile();
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handleAddExperience = async () => {
    if (!expForm.title.trim() || !expForm.situation.trim()) return;
    setAddingExp(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAddingExp(false); return; }

    const { error } = await supabase.from("experiences").insert({
      user_id: user.id,
      category: expForm.category,
      title: expForm.title.trim(),
      situation: expForm.situation.trim(),
      task: expForm.task.trim(),
      action: expForm.action.trim(),
      result: expForm.result.trim(),
      learnings: expForm.learnings.trim() || null,
      tags: expForm.tags.split(/[、,，\s]+/).filter(Boolean),
      sort_order: experiences.length,
    });

    if (!error) {
      setExpForm({ category: "gakuchika", title: "", situation: "", task: "", action: "", result: "", learnings: "", tags: "" });
      setShowExpForm(false);
      loadProfile();
    }
    setAddingExp(false);
  };

  const handleDeleteExperience = async (id: string) => {
    await supabase.from("experiences").delete().eq("id", id);
    loadProfile();
  };

  if (loading) return <div className="text-gray-500">読み込み中...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">プロフィール</h1>
      <p className="text-sm text-gray-500 mb-6">
        以下のいずれかの方法でプロフィールを登録してください。ESの自動入力に使用されます。
      </p>

      {/* File Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded">方法 1</span>
          <h2 className="font-bold">ファイルアップロード</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          履歴書・過去のES・自己紹介文をアップロードすると、AIが自動で情報を抽出します
        </p>
        <label className={`block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 transition ${uploading ? "opacity-50" : ""}`}>
          <span className="text-sm text-gray-500">
            {uploading ? "解析中..." : "クリックしてファイルを選択 (PDF / Word / テキスト)"}
          </span>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
        {uploadMsg && (
          <p className={`text-sm mt-2 ${uploadMsg.includes("失敗") ? "text-red-600" : "text-green-600"}`}>{uploadMsg}</p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">または</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Basic Info Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded">方法 2</span>
          <h2 className="font-bold">手動で入力</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          ファイルがない場合は、以下のフォームに直接入力してください
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="氏名（漢字）" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="山田 太郎" />
          <Field label="氏名（フリガナ）" value={form.furigana} onChange={(v) => setForm({ ...form, furigana: v })} placeholder="ヤマダ タロウ" />
          <Field label="メールアドレス" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="taro@example.com" type="email" />
          <Field label="電話番号" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="090-1234-5678" type="tel" />
          <Field label="大学名" value={form.university} onChange={(v) => setForm({ ...form, university: v })} placeholder="東京大学" />
          <Field label="学部・学科" value={form.faculty} onChange={(v) => setForm({ ...form, faculty: v })} placeholder="経済学部" />
          <Field label="学科・専攻" value={form.department} onChange={(v) => setForm({ ...form, department: v })} placeholder="経済学科" />
          <Field label="卒業予定年度" value={form.graduation_year} onChange={(v) => setForm({ ...form, graduation_year: v })} placeholder="2027" type="number" />
        </div>

        <div className="space-y-4 mb-4">
          <TextAreaField
            label="自己PR"
            value={form.self_pr}
            onChange={(v) => setForm({ ...form, self_pr: v })}
            placeholder="あなたの強みや特徴をアピールしてください..."
            rows={4}
          />
          <TextAreaField
            label="ガクチカ（学生時代に力を入れたこと）"
            value={form.gakuchika}
            onChange={(v) => setForm({ ...form, gakuchika: v })}
            placeholder="学生時代に最も力を入れたことを書いてください..."
            rows={6}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? "保存中..." : "基本情報を保存"}
          </button>
          {saveMsg && (
            <span className={`text-sm ${saveMsg.includes("失敗") ? "text-red-600" : "text-green-600"}`}>{saveMsg}</span>
          )}
        </div>
      </div>

      {/* Experiences */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">経験 ({experiences.length}件)</h2>
          <button
            onClick={() => setShowExpForm(!showExpForm)}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
          >
            + 経験を追加
          </button>
        </div>

        {/* Add experience form */}
        {showExpForm && (
          <div className="bg-white rounded-xl border-2 border-indigo-200 p-5 mb-4">
            <h3 className="font-semibold text-indigo-700 mb-3">新しい経験を追加</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">カテゴリ</label>
                <select
                  value={expForm.category}
                  onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {EXPERIENCE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <Field label="タイトル" value={expForm.title} onChange={(v) => setExpForm({ ...expForm, title: v })} placeholder="サークル代表としてイベント企画" />
            </div>

            <div className="space-y-3 mb-3">
              <TextAreaField label="状況 (Situation)" value={expForm.situation} onChange={(v) => setExpForm({ ...expForm, situation: v })} placeholder="どんな背景・状況だったか" rows={2} />
              <TextAreaField label="課題 (Task)" value={expForm.task} onChange={(v) => setExpForm({ ...expForm, task: v })} placeholder="何を達成する必要があったか" rows={2} />
              <TextAreaField label="行動 (Action)" value={expForm.action} onChange={(v) => setExpForm({ ...expForm, action: v })} placeholder="具体的に何をしたか" rows={3} />
              <TextAreaField label="結果 (Result)" value={expForm.result} onChange={(v) => setExpForm({ ...expForm, result: v })} placeholder="どんな成果・結果が出たか（数字があれば入れる）" rows={2} />
              <TextAreaField label="学び（任意）" value={expForm.learnings} onChange={(v) => setExpForm({ ...expForm, learnings: v })} placeholder="この経験から何を学んだか" rows={2} />
              <Field label="タグ（読点区切り）" value={expForm.tags} onChange={(v) => setExpForm({ ...expForm, tags: v })} placeholder="リーダーシップ、コミュニケーション、企画力" />
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowExpForm(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">キャンセル</button>
              <button
                onClick={handleAddExperience}
                disabled={addingExp || !expForm.title.trim()}
                className="px-5 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {addingExp ? "追加中..." : "経験を追加"}
              </button>
            </div>
          </div>
        )}

        {/* Experience list */}
        <div className="space-y-3">
          {experiences.map((exp) => (
            <div key={exp.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
              >
                <div>
                  <div className="font-medium">{exp.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {EXPERIENCE_CATEGORIES.find((c) => c.value === exp.category)?.label || exp.category}
                    {exp.tags.length > 0 && ` | ${exp.tags.join(", ")}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteExperience(exp.id); }}
                    className="text-gray-300 hover:text-red-500 transition"
                    title="削除"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                  <span className="text-gray-400">{expandedId === exp.id ? "−" : "+"}</span>
                </div>
              </div>

              {expandedId === exp.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 text-sm">
                  <STARItem label="状況 (Situation)" text={exp.situation} />
                  <STARItem label="課題 (Task)" text={exp.task} />
                  <STARItem label="行動 (Action)" text={exp.action} />
                  <STARItem label="結果 (Result)" text={exp.result} />
                  {exp.learnings && <STARItem label="学び" text={exp.learnings} />}

                  {Object.keys(exp.variants).length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-gray-500 mb-2">文字数変体</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(exp.variants).sort(([a], [b]) => Number(a) - Number(b)).map(([count, text]) => (
                          <details key={count} className="text-xs">
                            <summary className="cursor-pointer px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                              {count}字 ({[...text].length}字)
                            </summary>
                            <p className="mt-2 p-3 bg-gray-50 rounded-lg text-gray-700 leading-relaxed">{text}</p>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {experiences.length === 0 && !showExpForm && (
            <p className="text-sm text-gray-500 text-center py-8">
              上のファイルアップロードか「+ 経験を追加」ボタンから経験を登録してください
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        {value && <span className="text-xs text-gray-400">{[...value].length}字</span>}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-vertical"
      />
    </div>
  );
}

function STARItem({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-indigo-600 mb-1">{label}</div>
      <div className="text-gray-700 leading-relaxed">{text}</div>
    </div>
  );
}
