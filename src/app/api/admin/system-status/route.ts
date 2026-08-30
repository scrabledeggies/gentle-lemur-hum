import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getAdminClient } from "@/lib/db-admin";
import { getConnectionStatus } from "@/lib/pal-keys";

interface RelayStatus {
  id: string;
  name: string;
  host: string;
  status: string;
  daily_limit: number;
  sent_today: number;
  last_used_at: string | null;
}

interface EmailLogEntry {
  id: string;
  to: string;
  subject: string;
  status: string;
  sent_at: string;
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let serviceKey: {
    exists: boolean;
    looksValid?: boolean;
    looksPublishable?: boolean;
    hasWhitespaceOrQuotes?: boolean;
  };

  if (!rawKey) {
    serviceKey = { exists: false };
  } else {
    const trimmed = rawKey.trim().replace(/^['"]|['"]$/g, "");
    serviceKey = {
      exists: true,
      looksValid: trimmed.startsWith("eyJ") || trimmed.startsWith("sb_secret_"),
      looksPublishable: trimmed.startsWith("sb_publishable"),
      hasWhitespaceOrQuotes: trimmed !== rawKey,
    };
  }

  let database: { ok: boolean; message: string };
  let relays: RelayStatus[] = [];
  let recentEmails: EmailLogEntry[] = [];

  try {
    const admin = getAdminClient();
    const { error: pingError } = await admin.from("pal_setup").select("id").limit(1);

    if (pingError) {
      database = { ok: false, message: pingError.message };
    } else {
      database = { ok: true, message: "Connected" };

      const { data: relayData } = await admin
        .from("smtp_relays")
        .select("id, name, host, status, daily_limit, sent_today, last_used_at")
        .order("name", { ascending: true });
      relays = relayData ?? [];

      const { data: emailData } = await admin
        .from("email_log")
        .select("id, to, subject, status, sent_at")
        .order("sent_at", { ascending: false })
        .limit(5);
      recentEmails = emailData ?? [];
    }
  } catch (err) {
    database = {
      ok: false,
      message: err instanceof Error ? err.message : "Failed to reach the database",
    };
  }

  let kc: { connected: boolean; connectedAt: string | null; lastPingAt: string | null };
  try {
    kc = await getConnectionStatus();
  } catch (err) {
    console.error(
      "[system-status] Failed to load KC connection status:",
      err instanceof Error ? err.message : err,
    );
    kc = { connected: false, connectedAt: null, lastPingAt: null };
  }

  return NextResponse.json({ database, serviceKey, kc, relays, recentEmails });
}