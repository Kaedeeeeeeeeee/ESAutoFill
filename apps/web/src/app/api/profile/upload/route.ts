import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseFile } from "@/lib/parsers";
import { callGeminiPro } from "@/lib/ai/gemini";
import {
  PROFILE_PARSER_SYSTEM,
  buildParseMessage,
} from "@/lib/ai/prompts/profile-parser";
import { encrypt } from "@/lib/encryption";
import type { ParsedProfileData } from "@es-autofill/shared";

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Determine file type
  const ext = file.name.split(".").pop()?.toLowerCase();
  const fileType = ext === "pdf" ? "pdf" : ext === "docx" ? "docx" : "txt";

  const supabase = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  // Create upload record
  const storagePath = `uploads/${user.id}/${crypto.randomUUID()}.${ext}`;
  const { data: uploadRecord, error: insertError } = await supabase
    .from("file_uploads")
    .insert({
      user_id: user.id,
      file_name: file.name,
      file_type: fileType,
      storage_path: storagePath,
      status: "parsing",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    // Parse file to raw text
    const rawText = await parseFile(buffer, fileType);

    // AI: parse raw text into structured profile
    const parsed = await callGeminiPro<ParsedProfileData>(
      PROFILE_PARSER_SYSTEM,
      buildParseMessage(rawText)
    );

    // Update upload record
    await supabase
      .from("file_uploads")
      .update({
        parsed_text: rawText,
        parsed_structured: parsed as unknown as Record<string, unknown>,
        status: "parsed",
      })
      .eq("id", uploadRecord.id);

    // Upsert profile with parsed basic info
    const profileUpdate: Record<string, unknown> = {
      user_id: user.id,
      university: parsed.basicInfo.university,
      faculty: parsed.basicInfo.faculty,
      department: parsed.basicInfo.department,
      graduation_year: parsed.basicInfo.graduationYear,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      career_goals: parsed.careerGoals,
      self_pr: parsed.selfPr,
      gakuchika: parsed.gakuchika,
      updated_at: new Date().toISOString(),
    };

    // Encrypt PII
    if (parsed.basicInfo.name) {
      profileUpdate.full_name_enc = encrypt(parsed.basicInfo.name, user.id);
    }
    if (parsed.basicInfo.furigana) {
      profileUpdate.furigana_enc = encrypt(parsed.basicInfo.furigana, user.id);
    }
    if (parsed.basicInfo.email) {
      profileUpdate.email_enc = encrypt(parsed.basicInfo.email, user.id);
    }
    if (parsed.basicInfo.phone) {
      profileUpdate.phone_enc = encrypt(parsed.basicInfo.phone, user.id);
    }

    await supabase
      .from("profiles")
      .upsert(profileUpdate, { onConflict: "user_id" });

    // Insert experiences
    if (parsed.experiences.length > 0) {
      const experienceRows = parsed.experiences.map((exp, i) => ({
        user_id: user.id,
        category: exp.category,
        title: exp.title,
        situation: exp.situation,
        task: exp.task,
        action: exp.action,
        result: exp.result,
        learnings: exp.learnings,
        tags: exp.tags,
        sort_order: i,
      }));

      await supabase.from("experiences").insert(experienceRows);
    }

    return NextResponse.json({
      fileId: uploadRecord.id,
      status: "parsed",
      parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed";
    await supabase
      .from("file_uploads")
      .update({ status: "error", error_message: message })
      .eq("id", uploadRecord.id);

    return NextResponse.json(
      { fileId: uploadRecord.id, status: "error", errorMessage: message },
      { status: 500 }
    );
  }
}
