import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callGeminiProText } from "@/lib/ai/gemini";
import { decrypt } from "@/lib/encryption";
import { CHAT_FILL_SYSTEM, buildChatFillMessage } from "@/lib/ai/prompts/chat-fill";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/chat
 * Generate content for a single field based on user's chat response.
 * Used when the AI needs to ask the user a follow-up question.
 */
export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { remaining } = checkRateLimit(`ai:${user.id}`, RATE_LIMITS.ai);
  if (remaining < 0) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json();
  const {
    fieldCategory,
    fieldLabel,
    charLimit,
    userResponse,
    companyName,
  } = body as {
    fieldCategory: string;
    fieldLabel: string;
    charLimit: number | null;
    userResponse: string;
    companyName?: string;
  };

  if (!userResponse?.trim()) {
    return NextResponse.json({ error: "No response provided" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch profile for context
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Decrypt PII
  let decryptedProfile: Record<string, unknown> | undefined;
  if (profile) {
    decryptedProfile = { ...profile };
    for (const field of ["full_name", "furigana", "email", "phone"]) {
      const encField = `${field}_enc`;
      if (profile[encField]) {
        try {
          decryptedProfile![field] = decrypt(profile[encField], user.id);
        } catch {
          decryptedProfile![field] = null;
        }
      }
      delete decryptedProfile![encField];
    }
  }

  // Generate content
  let content = await callGeminiProText(
    CHAT_FILL_SYSTEM,
    buildChatFillMessage(
      fieldCategory,
      fieldLabel,
      charLimit,
      userResponse,
      decryptedProfile,
      companyName
    )
  );

  content = content.trim();

  // Enforce char limit
  if (charLimit && [...content].length > charLimit) {
    content = [...content].slice(0, charLimit).join("");
  }

  return NextResponse.json({
    content,
    charCount: [...content].length,
  });
}
