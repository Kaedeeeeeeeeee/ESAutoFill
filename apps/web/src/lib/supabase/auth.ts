import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

/**
 * Authenticate a request from the Chrome extension.
 * The extension sends the Supabase access token as a Bearer token.
 * Returns the authenticated user or null.
 */
export async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}
