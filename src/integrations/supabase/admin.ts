import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://etjkljrlffjolrsuwlrn.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
}

// This client bypasses Row Level Security. It must ONLY be used in
// server-side code (API routes / route handlers) and never be imported
// into any client component.
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});