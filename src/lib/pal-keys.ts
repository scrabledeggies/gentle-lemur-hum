import { getAdminClient } from "./db-admin";

/** Returns the active PAL API key, creating the table and a 32-char random key if needed. */
export async function getPalApiKey(): Promise<string | null> {
  const admin = getAdminClient();
  
  // Create table if missing
  const { error: tableErr } = await admin.rpc("create_table_if_not_exists", {
    table_name: "pal_keys",
    definition: "id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE NOT NULL, created_at timestamptz DEFAULT now()",
  });
  if (tableErr) {
    // Fall back to direct table access, table may exist
  }

  // Fetch existing key
  const { data, error } = await admin.from("pal_keys").select("key").limit(1).maybeSingle();
  if (data?.key) return data.key;

  // Generate new 32-char random key
  const key = Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)]).join("");
  const { error: insertErr } = await admin.from("pal_keys").insert({ key });
  if (insertErr) throw insertErr;
  return key;
}