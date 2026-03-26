import React, { useEffect, useState } from "react";
import { profileApi } from "@/shared/api-client";
import { COMMON_CHAR_LIMITS } from "@es-autofill/shared";

interface Profile {
  university?: string;
  faculty?: string;
  department?: string;
  graduation_year?: number;
  self_pr?: string;
  gakuchika?: string;
  strengths?: Array<{ title: string; description: string; evidence: string }>;
  weaknesses?: Array<{ title: string; description: string; improvement: string }>;
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

const CATEGORY_LABELS: Record<string, string> = {
  gakuchika: "ガクチカ",
  leadership: "リーダーシップ",
  teamwork: "チームワーク",
  challenge: "困難を乗り越えた経験",
  failure: "失敗経験",
  strength_evidence: "強みの根拠",
  part_time: "アルバイト",
  club: "部活・サークル",
  research: "研究",
  volunteer: "ボランティア",
  internship: "インターン",
  other: "その他",
};

export function ProfileViewer() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingVariants, setGeneratingVariants] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await profileApi.get();
      setProfile(data.profile as Profile);
      setExperiences(data.experiences as Experience[]);
    } catch {
      // Not logged in or no profile
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVariants = async (expId: string) => {
    setGeneratingVariants(expId);
    try {
      const result = await profileApi.generateVariants(
        expId,
        [...COMMON_CHAR_LIMITS]
      ) as { variants: Record<string, string> };

      setExperiences((prev) =>
        prev.map((exp) =>
          exp.id === expId ? { ...exp, variants: result.variants } : exp
        )
      );
    } catch {
      // Error generating
    } finally {
      setGeneratingVariants(null);
    }
  };

  if (loading) {
    return <p style={{ fontSize: "13px", color: "#6b7280" }}>読み込み中...</p>;
  }

  if (!profile) {
    return (
      <p style={{ fontSize: "13px", color: "#6b7280" }}>
        プロフィールがまだありません。上部からファイルをアップロードしてください。
      </p>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>プロフィール</h3>

      {/* Basic info */}
      <div style={{ background: "white", borderRadius: "8px", padding: "12px", marginBottom: "12px", border: "1px solid #e5e7eb" }}>
        <InfoRow label="大学" value={profile.university} />
        <InfoRow label="学部" value={profile.faculty} />
        {profile.department && <InfoRow label="学科" value={profile.department} />}
        <InfoRow label="卒業年度" value={profile.graduation_year ? `${profile.graduation_year}年` : undefined} />
      </div>

      {/* Strengths */}
      {profile.strengths && profile.strengths.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <h4 style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", marginBottom: "6px" }}>強み</h4>
          {profile.strengths.map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: "6px", padding: "8px 10px", marginBottom: "4px", border: "1px solid #e5e7eb", fontSize: "12px" }}>
              <span style={{ fontWeight: 500 }}>{s.title}</span>
              <span style={{ color: "#6b7280" }}> — {s.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Self PR preview */}
      {typeof profile.self_pr === "string" && (
        <div style={{ background: "white", borderRadius: "8px", padding: "12px", marginBottom: "12px", border: "1px solid #e5e7eb" }}>
          <h4 style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>自己PR</h4>
          <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>
            {profile.self_pr.slice(0, 150)}
            {profile.self_pr.length > 150 ? "..." : ""}
          </p>
          <span style={{ fontSize: "11px", color: "#9ca3af" }}>{[...profile.self_pr].length}字</span>
        </div>
      )}

      {/* Experiences */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h4 style={{ fontSize: "13px", fontWeight: 600 }}>経験 ({experiences.length}件)</h4>
      </div>

      {experiences.map((exp) => {
        const isExpanded = expandedId === exp.id;
        const variantCount = Object.keys(exp.variants || {}).length;
        const isGenerating = generatingVariants === exp.id;

        return (
          <div
            key={exp.id}
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "8px",
              border: `1px solid ${isExpanded ? "#4f46e5" : "#e5e7eb"}`,
              transition: "border-color 0.2s",
            }}
          >
            {/* Header */}
            <div
              style={{ cursor: "pointer" }}
              onClick={() => setExpandedId(isExpanded ? null : exp.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 500 }}>{exp.title}</span>
                <span style={{ fontSize: "16px", color: "#9ca3af" }}>{isExpanded ? "−" : "+"}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                {CATEGORY_LABELS[exp.category] || exp.category}
                {exp.tags.length > 0 && ` | ${exp.tags.join(", ")}`}
                {variantCount > 0 && (
                  <span style={{ color: "#22c55e", marginLeft: "8px" }}>{variantCount}種の文字数変体</span>
                )}
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div style={{ marginTop: "10px", borderTop: "1px solid #e5e7eb", paddingTop: "10px" }}>
                {/* STAR structure */}
                <STARSection label="状況 (Situation)" text={exp.situation} />
                <STARSection label="課題 (Task)" text={exp.task} />
                <STARSection label="行動 (Action)" text={exp.action} />
                <STARSection label="結果 (Result)" text={exp.result} />
                {exp.learnings && <STARSection label="学び" text={exp.learnings} />}

                {/* Variants */}
                <div style={{ marginTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>文字数変体</span>
                    <button
                      onClick={() => handleGenerateVariants(exp.id)}
                      disabled={isGenerating}
                      style={{
                        padding: "3px 10px",
                        background: isGenerating ? "#e5e7eb" : "#4f46e5",
                        color: isGenerating ? "#6b7280" : "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: isGenerating ? "wait" : "pointer",
                        fontSize: "11px",
                      }}
                    >
                      {isGenerating ? "生成中..." : "一括生成"}
                    </button>
                  </div>

                  {variantCount > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {Object.entries(exp.variants)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([charCount, text]) => (
                          <VariantChip
                            key={charCount}
                            charCount={charCount}
                            text={text}
                          />
                        ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "11px", color: "#9ca3af" }}>
                      「一括生成」で200〜800字の変体を自動生成します
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ fontSize: "12px", marginBottom: "4px" }}>
      <span style={{ color: "#6b7280" }}>{label}: </span>
      <span style={{ color: "#1f2937" }}>{value}</span>
    </div>
  );
}

function STARSection({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginBottom: "6px" }}>
      <div style={{ fontSize: "11px", fontWeight: 600, color: "#4f46e5", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function VariantChip({ charCount, text }: { charCount: string; text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ width: "100%", marginBottom: "4px" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "3px 10px",
          background: "#eef2ff",
          border: "1px solid #c7d2fe",
          borderRadius: "12px",
          cursor: "pointer",
          fontSize: "11px",
          color: "#4338ca",
        }}
      >
        {charCount}字 ({[...text].length}字)
        <span style={{ fontSize: "10px" }}>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div
          style={{
            marginTop: "4px",
            padding: "8px",
            background: "#f9fafb",
            borderRadius: "6px",
            fontSize: "11px",
            lineHeight: 1.5,
            color: "#374151",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
