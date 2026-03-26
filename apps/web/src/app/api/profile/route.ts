import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "@/lib/encryption";

const PII_FIELDS = ["full_name", "furigana", "email", "phone"] as const;

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Fetch experiences
  const { data: experiences } = await supabase
    .from("experiences")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order");

  // Decrypt PII fields
  if (profile) {
    for (const field of PII_FIELDS) {
      const encField = `${field}_enc`;
      if (profile[encField]) {
        try {
          profile[field] = decrypt(profile[encField], user.id);
        } catch {
          profile[field] = null;
        }
      }
    }
  }

  return NextResponse.json({ profile, experiences: experiences ?? [] });
}

export async function PUT(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createAdminClient();

  // Encrypt PII fields
  const updateData: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() };
  for (const field of PII_FIELDS) {
    if (field in updateData && updateData[field]) {
      updateData[`${field}_enc`] = encrypt(String(updateData[field]), user.id);
      delete updateData[field];
    }
  }

  // Upsert profile
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, ...updateData }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
