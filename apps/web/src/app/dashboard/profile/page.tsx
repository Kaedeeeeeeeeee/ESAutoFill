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
  tags: string[];
  variants: Record<string, string>;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const res = await apiFetch("/api/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      setExperiences(data.experiences ?? []);
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

    if (res.ok) {
      setUploadMsg("プロフィールを更新しました");
      loadProfile();
    } else {
      setUploadMsg("アップロードに失敗しました");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (loading) return <div className="text-gray-500">読み込み中...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">プロフィール</h1>

      {/* File Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-bold mb-2">ファイルアップロード</h2>
        <p className="text-sm text-gray-500 mb-4">
          履歴書・ES・自己紹介文をアップロードすると、AIが自動でプロフィールを生成します
        </p>
        <label className={`block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 transition ${uploading ? "opacity-50" : ""}`}>
          <span className="text-sm text-gray-500">
            {uploading ? "解析中..." : "クリックしてファイルを選択 (PDF / Word / テキスト)"}
          </span>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
        {uploadMsg && (
          <p className={`text-sm mt-2 ${uploadMsg.includes("失敗") ? "text-red-600" : "text-green-600"}`}>{uploadMsg}</p>
        )}
      </div>

      {/* Basic Info */}
      {profile && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-bold mb-4">基本情報</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="氏名" value={profile.full_name} />
            <InfoRow label="フリガナ" value={profile.furigana} />
            <InfoRow label="メール" value={profile.email} />
            <InfoRow label="電話番号" value={profile.phone} />
            <InfoRow label="大学" value={profile.university} />
            <InfoRow label="学部" value={profile.faculty} />
            <InfoRow label="学科" value={profile.department} />
            <InfoRow label="卒業年度" value={profile.graduation_year ? `${profile.graduation_year}年` : undefined} />
          </div>
        </div>
      )}

      {/* Self PR */}
      {profile?.self_pr && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-bold mb-2">自己PR</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.self_pr}</p>
          <span className="text-xs text-gray-400 mt-2 block">{[...profile.self_pr].length}字</span>
        </div>
      )}

      {/* Experiences */}
      <div className="mb-6">
        <h2 className="font-bold mb-3">経験 ({experiences.length}件)</h2>
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
                    {exp.category} | {exp.tags.join(", ")}
                    {Object.keys(exp.variants).length > 0 && (
                      <span className="text-green-600 ml-2">{Object.keys(exp.variants).length}種の変体あり</span>
                    )}
                  </div>
                </div>
                <span className="text-gray-400">{expandedId === exp.id ? "−" : "+"}</span>
              </div>

              {expandedId === exp.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 text-sm">
                  <STARItem label="状況 (Situation)" text={exp.situation} />
                  <STARItem label="課題 (Task)" text={exp.task} />
                  <STARItem label="行動 (Action)" text={exp.action} />
                  <STARItem label="結果 (Result)" text={exp.result} />

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

          {experiences.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              ファイルをアップロードすると、経験が自動で抽出されます
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className="font-medium">{value ?? "—"}</span>
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
