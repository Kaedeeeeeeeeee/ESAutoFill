import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callGeminiProText } from "@/lib/ai/gemini";
import { decrypt } from "@/lib/encryption";
import {
  SHIBOUDOUKI_SYSTEM,
  buildShiboudoukiMessage,
} from "@/lib/ai/prompts/shiboudouki";
import type { ShiboudoukiRequest } from "@es-autofill/shared";

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ShiboudoukiRequest;
  const supabase = createAdminClient();

  // Fetch company
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", body.companyId)
    .eq("user_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Decrypt PII
  const decryptedProfile: Record<string, unknown> = { ...profile };
  for (const field of ["full_name", "furigana", "email", "phone"]) {
    const encField = `${field}_enc`;
    if (profile[encField]) {
      try {
        decryptedProfile[field] = decrypt(profile[encField], user.id);
      } catch {
        decryptedProfile[field] = null;
      }
    }
    delete decryptedProfile[encField];
  }

  // Fetch experiences
  const { data: experiences } = await supabase
    .from("experiences")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order");

  // Generate 志望動機
  const shiboudouki = await callGeminiProText(
    SHIBOUDOUKI_SYSTEM,
    buildShiboudoukiMessage(
      decryptedProfile,
      experiences ?? [],
      {
        companyName: company.company_name,
        missionStatement: company.mission_statement,
        businessAreas: company.business_areas,
        companyValues: company.company_values,
        recentNews: company.recent_news,
        userKeywords: body.keywords,
      },
      body.charLimit
    )
  );

  const charCount = [...shiboudouki.trim()].length;

  // Save to company record
  await supabase
    .from("companies")
    .update({
      shiboudouki: shiboudouki.trim(),
      user_keywords: body.keywords,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.companyId);

  return NextResponse.json({
    shiboudouki: shiboudouki.trim(),
    charCount,
  });
}
