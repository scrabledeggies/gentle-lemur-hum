import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://etjkljrlffjolrsuwlrn.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Lazy accessor so tools can avoid crashing on import when env var is missing.
 */
export function getAdminClient(): SupabaseClient {
  if (!SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}