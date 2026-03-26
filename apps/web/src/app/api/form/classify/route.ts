import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/auth";
import { callGeminiFlash } from "@/lib/ai/gemini";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  FIELD_CLASSIFIER_SYSTEM,
  buildClassifyMessage,
} from "@/lib/ai/prompts/field-classifier";
import type { ClassifyRequest, ClassifyResponse } from "@es-autofill/shared";

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { remaining } = checkRateLimit(`ai:${user.id}`, RATE_LIMITS.ai);
  if (remaining < 0) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = (await request.json()) as ClassifyRequest;

  const fields = body.fields.map((f) => ({
    index: f.index,
    label: f.label,
    surroundingText: f.surroundingText,
    charLimit: f.charLimit,
    inputType: f.inputType,
    ...(f.options ? { options: f.options } : {}),
  }));

  const result = await callGeminiFlash<ClassifyResponse>(
    FIELD_CLASSIFIER_SYSTEM,
    buildClassifyMessage(fields)
  );

  // Merge original field data back into classification results
  const classifications = result.classifications.map((c) => {
    const originalField = body.fields.find((f) => f.index === c.index);
    return {
      ...c,
      selector: originalField?.selector ?? "",
      inputType: originalField?.inputType,
      options: originalField?.options,
    };
  });

  return NextResponse.json({ classifications });
}
