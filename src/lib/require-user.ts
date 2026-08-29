import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const SUPABASE_URL = "https://etjkljrlffjolrsuwlrn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bQZRf51PfaAR4F6NsMojYw_yRo9HsSi";

export async function requireUser(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return user;
}
