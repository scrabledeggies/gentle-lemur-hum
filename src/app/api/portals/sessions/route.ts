import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db-admin";
import { requirePalKey } from "@/lib/require-pal-key";

function randomString(length: number): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  const authorized = await requirePalKey(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    category_id?: string;
    needs_credentials?: boolean;
    preset?: Record<string, unknown>;
    agent_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { category_id, needs_credentials, preset, agent_id } = body;
  if (!category_id) {
    return NextResponse.json({ error: "Missing category_id" }, { status: 400 });
  }

  const admin = getAdminClient();

  const { data: subdomain, error: subError } = await admin
    .from("subdomains")
    .select("id, prefix, domain_id, status")
    .eq("id", category_id)
    .maybeSingle();

  if (subError || !subdomain || subdomain.status !== "active") {
    return NextResponse.json({ error: "Unknown or inactive category" }, { status: 404 });
  }

  const { data: domain } = await admin
    .from("domains")
    .select("domain_name")
    .eq("id", subdomain.domain_id)
    .maybeSingle();

  const host = domain ? `${subdomain.prefix}.${domain.domain_name}` : subdomain.prefix;
  const portalUrl = `https://${host}/`;

  const now = Date.now();
  const expiresAt = new Date(now + 48 * 60 * 60 * 1000).toISOString();
  const warnAt = new Date(now + 47 * 60 * 60 * 1000).toISOString();

  let credentials: { username: string; password: string } | undefined;
  if (needs_credentials) {
    credentials = { username: randomString(8), password: randomString(12) };
  }

  const { data: session, error: insertError } = await admin
    .from("sessions")
    .insert({
      subdomain_id: subdomain.id,
      status: "waiting",
      agent_id: agent_id ?? null,
      category_id,
      preset: preset ?? {},
      credentials: credentials ?? {},
      captures: {},
      autofill: {},
      expires_at: expiresAt,
      warn_at: warnAt,
    })
    .select("id")
    .single();

  if (insertError || !session) {
    console.error("[portals-sessions] Failed to create session:", insertError?.message);
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to create session" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    session_id: session.id,
    portal_url: portalUrl,
    subdomain: host,
    credentials,
    expires_at: expiresAt,
    warn_at: warnAt,
  });
}