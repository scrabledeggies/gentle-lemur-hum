import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://etjkljrlffjolrsuwlrn.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertValidServiceRoleKey(): string {
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. In Vercel → Settings → Environment Variables, add a variable named SUPABASE_SERVICE_ROLE_KEY and paste the service_role secret from Supabase → Project Settings → API."
    );
  }
  if (SERVICE_ROLE_KEY.startsWith("sb_publishable")) {
    throw new Error(
      "WRONG KEY: You pasted a Publishable Key into SUPABASE_SERVICE_ROLE_KEY. In Supabase → Project Settings → API, copy the key labeled service_role (secret) — it starts with 'sb_secret_' or 'eyJ', NOT 'sb_publishable'."
    );
  }
  const isLegacyJwtFormat = SERVICE_ROLE_KEY.startsWith("eyJ");
  const isNewSecretFormat = SERVICE_ROLE_KEY.startsWith("sb_secret_");
  if (!isLegacyJwtFormat && !isNewSecretFormat) {
    throw new Error(
      "WRONG KEY: Your SUPABASE_SERVICE_ROLE_KEY does not look like a valid Supabase API key. In Supabase → Project Settings → API, copy the service_role secret key. It should start with 'sb_secret_' (new projects) or 'eyJ' (older projects)."
    );
  }
  return SERVICE_ROLE_KEY;
}

/**
 * Lazy accessor so tools can avoid crashing on import when env var is missing.
 */
export function getAdminClient(): SupabaseClient {
  const key = assertValidServiceRoleKey();
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
}