import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callGeminiPro } from "@/lib/ai/gemini";
import { decrypt } from "@/lib/encryption";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  CONTENT_GENERATOR_SYSTEM,
  buildGenerateMessage,
} from "@/lib/ai/prompts/content-generator";
import type { GenerateRequest, GenerateResponse } from "@es-autofill/shared";

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { remaining } = checkRateLimit(`ai:${user.id}`, RATE_LIMITS.ai);
  if (remaining < 0) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = (await request.json()) as GenerateRequest;
  const supabase = createAdminClient();

  // Filter out non_es fields
  const fieldsToFill = body.classifications.filter(
    (c) => c.category !== "non_es"
  );

  if (fieldsToFill.length === 0) {
    return NextResponse.json({ fills: [] });
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

  // Decrypt PII for AI context
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

  // Fetch company context if provided
  let company: Record<string, unknown> | undefined;
  if (body.companyId) {
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("id", body.companyId)
      .eq("user_id", user.id)
      .single();
    if (data) company = data;
  }

  // Call Claude to generate content
  const result = await callGeminiPro<GenerateResponse>(
    CONTENT_GENERATOR_SYSTEM,
    buildGenerateMessage(
      fieldsToFill.map((f) => {
        const fc = f as unknown as Record<string, unknown>;
        return {
          index: f.index,
          category: f.category,
          charLimit: f.charLimit ?? fc.char_limit as number | null,
          inputType: fc.inputType as string | undefined,
          options: fc.options as Array<{ value: string; text: string }> | undefined,
        };
      }),
      decryptedProfile,
      experiences ?? [],
      company
    )
  );

  // Attach selectors back + enforce char limits as safety net
  const fills = result.fills.map((fill) => {
    const classification = body.classifications.find(
      (c) => c.index === fill.index
    );
    // Truncate if AI exceeded the limit
    let content = fill.content;
    const charLimit = classification?.charLimit ?? (classification as unknown as Record<string, unknown>)?.char_limit as number | undefined;
    if (charLimit && [...content].length > charLimit) {
      content = [...content].slice(0, charLimit).join("");
    }
    return {
      ...fill,
      content,
      selector: classification?.selector ?? "",
      charCount: [...content].length,
      source: "generated" as const,
    };
  });

  return NextResponse.json({ fills });
}
