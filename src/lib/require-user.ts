import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const SUPABASE_URL = "https://etjkljrlffjolrsuwlrn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bQZRf51PfaAR4F6NsMojYw_yRo9HsSi";

const verifier = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});

export async function requireUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data, error } = await verifier.auth.getUser(token);
  if (error) {
    console.warn("[require-user] getUser failed:", error.message);
    return null;
  }
  return data.user ?? null;
}