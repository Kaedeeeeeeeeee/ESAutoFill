import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** DELETE /api/profile/delete-all — Delete all user data (GDPR-style) */
export async function DELETE(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Delete in order (respecting foreign keys)
  // submissions → companies → experiences → file_uploads → profiles
  const tables = ["submissions", "companies", "experiences", "file_uploads", "profiles"];

  const errors: string[] = [];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    if (error) errors.push(`${table}: ${error.message}`);
  }

  // Delete uploaded files from storage
  const { data: files } = await supabase.storage
    .from("uploads")
    .list(user.id);

  if (files && files.length > 0) {
    const filePaths = files.map((f) => `${user.id}/${f.name}`);
    await supabase.storage.from("uploads").remove(filePaths);
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Partial deletion", details: errors },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: "全てのデータを削除しました" });
}
