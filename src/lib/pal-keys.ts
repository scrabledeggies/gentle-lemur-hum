import { getAdminClient } from "./db-admin";

interface PalSetup {
  id: string;
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
    .select("id, api_key, handshake_secret, handshake_used")
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
    .select("id, api_key, handshake_secret, handshake_used")
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

/** The current one-time code the builder pastes into KC. */
export async function getHandshakeSecret(): Promise<string> {
  const setup = await getOrCreateSetup();
  return setup.handshake_secret;
}

/**
 * Force-rotate to a brand-new handshake code (e.g. when the admin wants to
 * reconnect KC). Returns the new code.
 */
export async function rotateHandshakeSecret(): Promise<string> {
  const setup = await getOrCreateSetup();
  const newSecret = randomString(20);
  const admin = getAdminClient();

  const { error } = await admin
    .from("pal_setup")
    .update({ handshake_secret: newSecret, handshake_used: false })
    .eq("id", setup.id);

  if (error) {
    throw new Error(`Failed to rotate handshake code: ${error.message}`);
  }

  return newSecret;
}

/**
 * Single-use exchange: on a match, immediately rotate to a fresh code so the
 * old one can never be replayed, then return the long-lived API key.
 */
export async function verifyHandshakeSecret(secret: string): Promise<string | null> {
  const setup = await getOrCreateSetup();
  if (setup.handshake_secret !== secret) return null;

  const admin = getAdminClient();
  const { error } = await admin
    .from("pal_setup")
    .update({ handshake_secret: randomString(20), handshake_used: false })
    .eq("id", setup.id);

  if (error) {
    throw new Error(`Failed to rotate handshake code: ${error.message}`);
  }

  return setup.api_key;
}
