import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callGeminiProText, callGeminiPro } from "@/lib/ai/gemini";
import { decrypt } from "@/lib/encryption";
import {
  CHAT_FILL_SYSTEM,
  CHAT_FILL_BATCH_SYSTEM,
  buildChatFillMessage,
  buildChatFillBatchMessage,
} from "@/lib/ai/prompts/chat-fill";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

async function getDecryptedProfile(userId: string) {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!profile) return undefined;

  const decrypted: Record<string, unknown> = { ...profile };
  for (const field of ["full_name", "furigana", "email", "phone"]) {
    const encField = `${field}_enc`;
    if (profile[encField]) {
      try {
        decrypted[field] = decrypt(profile[encField], userId);
      } catch {
        decrypted[field] = null;
      }
    }
    delete decrypted[encField];
  }
  return decrypted;
}

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
  const userResponse = body.userResponse as string;

  if (!userResponse?.trim()) {
    return NextResponse.json({ error: "No response provided" }, { status: 400 });
  }

  const decryptedProfile = await getDecryptedProfile(user.id);

  // Batch mode: multiple fields at once
  if (body.fields && Array.isArray(body.fields)) {
    const fields = body.fields as Array<{
      fieldIndex: number;
      fieldCategory: string;
      fieldLabel: string;
      charLimit: number | null;
      options?: Array<{ value: string; text: string }>;
    }>;

    const result = await callGeminiPro<{
      fills: Array<{ fieldIndex: number; content: string; charCount: number }>;
    }>(
      CHAT_FILL_BATCH_SYSTEM,
      buildChatFillBatchMessage(fields, userResponse, decryptedProfile)
    );

    // Enforce char limits
    const fills = result.fills.map((fill) => {
      const field = fields.find((f) => f.fieldIndex === fill.fieldIndex);
      let content = fill.content;
      if (field?.charLimit && [...content].length > field.charLimit) {
        content = [...content].slice(0, field.charLimit).join("");
      }
      return { ...fill, content, charCount: [...content].length };
    });

    return NextResponse.json({ fills });
  }

  // Single field mode (backward compatible)
  const { fieldCategory, fieldLabel, charLimit, companyName } = body as {
    fieldCategory: string;
    fieldLabel: string;
    charLimit: number | null;
    companyName?: string;
  };

  let content = await callGeminiProText(
    CHAT_FILL_SYSTEM,
    buildChatFillMessage(fieldCategory, fieldLabel, charLimit, userResponse, decryptedProfile, companyName)
  );

  content = content.trim();
  if (charLimit && [...content].length > charLimit) {
    content = [...content].slice(0, charLimit).join("");
  }

  return NextResponse.json({ content, charCount: [...content].length });
}
