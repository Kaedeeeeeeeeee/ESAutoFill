import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  let query = supabase
    .from("submissions")
    .select("*, companies(company_name)")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submissions: data });
}

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("submissions")
    .insert({
      user_id: user.id,
      company_id: body.companyId || null,
      page_url: body.pageUrl,
      page_title: body.pageTitle,
      fields_snapshot: body.fieldsSnapshot,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update company senkou_status if linked
  if (body.companyId) {
    await supabase
      .from("companies")
      .update({
        senkou_status: "ES提出済",
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.companyId)
      .eq("user_id", user.id)
      .eq("senkou_status", "未応募");
  }

  return NextResponse.json({ submission: data }, { status: 201 });
}
