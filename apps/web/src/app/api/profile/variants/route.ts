import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callGeminiProText } from "@/lib/ai/gemini";
import {
  CHAR_ADJUSTER_SYSTEM,
  buildAdjustMessage,
} from "@/lib/ai/prompts/char-adjuster";
import type { VariantsRequest } from "@es-autofill/shared";

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as VariantsRequest;
  const { experienceId, targetCharCounts } = body;

  const supabase = createAdminClient();

  // Fetch the experience
  const { data: experience, error } = await supabase
    .from("experiences")
    .select("*")
    .eq("id", experienceId)
    .eq("user_id", user.id)
    .single();

  if (error || !experience) {
    return NextResponse.json({ error: "Experience not found" }, { status: 404 });
  }

  // Build full text from STAR
  const fullText = `${experience.situation}${experience.task}${experience.action}${experience.result}${experience.learnings || ""}`;

  // Generate variants for each target char count
  const existingVariants: Record<string, string> = experience.variants || {};
  const newVariants: Record<string, string> = { ...existingVariants };

  await Promise.all(
    targetCharCounts
      .filter((count) => !existingVariants[String(count)])
      .map(async (count) => {
        const adjusted = await callGeminiProText(
          CHAR_ADJUSTER_SYSTEM,
          buildAdjustMessage(fullText, count)
        );
        newVariants[String(count)] = adjusted.trim();
      })
  );

  // Update experience with new variants
  await supabase
    .from("experiences")
    .update({ variants: newVariants, updated_at: new Date().toISOString() })
    .eq("id", experienceId);

  return NextResponse.json({ variants: newVariants });
}
