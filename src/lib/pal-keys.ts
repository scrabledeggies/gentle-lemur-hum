import { getAdminClient } from "./db-admin";

interface PalSetup {
  api_key: string;
  handshake_secret: string;
  handshake_used: boolean;
}

function randomString(length: number): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function getOrCreateSetup(): Promise<PalSetup> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from("pal_setup")
    .select("api_key, handshake_secret, handshake_used")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read pal_setup: ${error.message}`);
  }

  if (data) return data as PalSetup;

  const api_key = randomString(32);
  const handshake_secret = randomString(20);

  const { data: inserted, error: insertError } = await admin
    .from("pal_setup")
    .insert({ api_key, handshake_secret })
    .select("api_key, handshake_secret, handshake_used")
    .single();

  if (insertError) {
    throw new Error(`Failed to create pal_setup: ${insertError.message}`);
  }

  return inserted as PalSetup;
}

export async function getPalApiKey(): Promise<string> {
  const setup = await getOrCreateSetup();
  return setup.api_key;
}

export async function getHandshakeSecret(): Promise<string> {
  const setup = await getOrCreateSetup();
  return setup.handshake_secret;
}

/** Returns the real API key if the secret matches, otherwise null. */
export async function verifyHandshakeSecret(secret: string): Promise<string | null> {
  const setup = await getOrCreateSetup();
  if (setup.handshake_secret !== secret) return null;
  return setup.api_key;
}