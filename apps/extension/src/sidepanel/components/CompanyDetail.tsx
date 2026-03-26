import React, { useState } from "react";
import { companyApi } from "@/shared/api-client";
import { SENKOU_STATUSES, type CompanyItem } from "./CompanyList";

interface Props {
  company: CompanyItem;
  onBack: () => void;
  onUpdate: () => void;
}

export function CompanyDetail({ company, onBack, onUpdate }: Props) {
  const [keywords, setKeywords] = useState(company.user_keywords?.join("、") ?? "");
  const [charLimit, setCharLimit] = useState("400");
  const [shiboudouki, setShiboudouki] = useState(company.shiboudouki ?? "");
  const [generating, setGenerating] = useState(false);
  const [researching, setResearching] = useState(false);
  const [status, setStatus] = useState(company.senkou_status);
  const [researchData, setResearchData] = useState({
    mission: company.mission_statement,
    areas: company.business_areas,
    values: company.company_values,
    news: company.recent_news,
  });

  const handleResearch = async () => {
    setResearching(true);
    try {
      const result = await companyApi.research(company.id) as {
        research: {
          mission_statement: string;
          business_areas: string[];
          company_values: string[];
          recent_news: Array<{ title: string; date: string; summary: string }>;
        };
      };
      setResearchData({
        mission: result.research.mission_statement,
        areas: result.research.business_areas,
        values: result.research.company_values,
        news: result.research.recent_news,
      });
      onUpdate();
    } catch {
      // Error
    } finally {
      setResearching(false);
    }
  };

  const handleGenerate = async () => {
    const keywordList = keywords.split(/[、,，\s]+/).filter(Boolean);
    if (keywordList.length === 0) return;

    setGenerating(true);
    try {
      const result = await companyApi.generateShiboudouki(
        company.id,
        keywordList,
        parseInt(charLimit, 10) || undefined
      ) as { shiboudouki: string; charCount: number };
      setShiboudouki(result.shiboudouki);
      onUpdate();
    } catch {
      // Error
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    await companyApi.update({ id: company.id, senkou_status: newStatus });
    onUpdate();
  };

  return (
    <div>
      {/* Back button + title */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
            color: "#6b7280",
            padding: "0 4px",
          }}
        >
          ←
        </button>
        <h3 style={{ fontSize: "15px", fontWeight: 600 }}>{company.company_name}</h3>
      </div>

      {/* Status selector */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "4px" }}>
          選考ステータス
        </label>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "13px",
            background: "white",
          }}
        >
          {SENKOU_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Company research */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: 600 }}>企業情報</h4>
          <button
            onClick={handleResearch}
            disabled={researching}
            style={{
              padding: "4px 10px",
              background: researching ? "#e5e7eb" : "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              cursor: researching ? "wait" : "pointer",
              fontSize: "11px",
            }}
          >
            {researching ? "収集中..." : "自動収集"}
          </button>
        </div>

        {researchData.mission ? (
          <div style={{ background: "white", borderRadius: "8px", padding: "10px", border: "1px solid #e5e7eb", fontSize: "12px" }}>
            {researchData.mission && (
              <div style={{ marginBottom: "8px" }}>
                <span style={{ color: "#6b7280" }}>企業理念: </span>
                <span style={{ color: "#1f2937" }}>{researchData.mission}</span>
              </div>
            )}
            {researchData.areas && researchData.areas.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <span style={{ color: "#6b7280" }}>事業領域: </span>
                <span style={{ color: "#1f2937" }}>{researchData.areas.join("、")}</span>
              </div>
            )}
            {researchData.values && researchData.values.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <span style={{ color: "#6b7280" }}>価値観: </span>
                <span style={{ color: "#1f2937" }}>{researchData.values.join("、")}</span>
              </div>
            )}
            {researchData.news && researchData.news.length > 0 && (
              <div>
                <span style={{ color: "#6b7280" }}>最近のニュース:</span>
                {researchData.news.map((n, i) => (
                  <div key={i} style={{ marginTop: "4px", paddingLeft: "8px", borderLeft: "2px solid #e5e7eb" }}>
                    <div style={{ fontWeight: 500 }}>{n.title}</div>
                    <div style={{ color: "#6b7280", fontSize: "11px" }}>{n.summary}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontSize: "12px", color: "#9ca3af" }}>
            「自動収集」をクリックして企業情報を取得してください
          </p>
        )}
      </div>

      {/* 志望動機 generation */}
      <div style={{ marginBottom: "16px" }}>
        <h4 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>志望動機</h4>

        <label style={{ fontSize: "11px", color: "#6b7280", display: "block", marginBottom: "4px" }}>
          志望理由のキーワード（読点区切り）
        </label>
        <textarea
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="例: グローバル展開、技術力、社会貢献"
          style={{
            width: "100%",
            minHeight: "48px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            padding: "8px",
            fontSize: "12px",
            fontFamily: "inherit",
            resize: "vertical",
            marginBottom: "8px",
          }}
        />

        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
          <label style={{ fontSize: "11px", color: "#6b7280" }}>文字数:</label>
          <select
            value={charLimit}
            onChange={(e) => setCharLimit(e.target.value)}
            style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px" }}
          >
            {[200, 300, 400, 500, 600, 800].map((n) => (
              <option key={n} value={n}>{n}字</option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating || !keywords.trim()}
            style={{
              flex: 1,
              padding: "6px",
              background: generating ? "#a5b4fc" : "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: generating ? "wait" : "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {generating ? "生成中..." : "志望動機を生成"}
          </button>
        </div>

        {shiboudouki && (
          <div style={{ background: "white", borderRadius: "8px", padding: "10px", border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: 500 }}>生成済み</span>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>{[...shiboudouki].length}字</span>
            </div>
            <p style={{ fontSize: "12px", color: "#1f2937", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {shiboudouki}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
