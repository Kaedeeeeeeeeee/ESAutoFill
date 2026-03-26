import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callGeminiFlash } from "@/lib/ai/gemini";

const RESEARCH_SYSTEM = `You research Japanese companies for job-seeking students.
Given a company name and optional URL, provide structured research data.

Output JSON:
{
  "mission_statement": string | null,
  "business_areas": string[],
  "company_values": string[],
  "recent_news": [{ "title": string, "date": string, "summary": string }]
}

Rules:
1. Only include information you are confident about. Do not fabricate.
2. All text in Japanese.
3. recent_news should include 2-3 notable items if known.
4. business_areas should list the company's main business segments.`;

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { companyId } = await request.json();
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const research = await callGeminiFlash<{
    mission_statement: string | null;
    business_areas: string[];
    company_values: string[];
    recent_news: Array<{ title: string; date: string; summary: string }>;
  }>(
    RESEARCH_SYSTEM,
    `企業名: ${company.company_name}\nURL: ${company.company_url || "不明"}`
  );

  // Update company with research data
  await supabase
    .from("companies")
    .update({
      mission_statement: research.mission_statement,
      business_areas: research.business_areas,
      company_values: research.company_values,
      recent_news: research.recent_news,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);

  return NextResponse.json({ research });
}
