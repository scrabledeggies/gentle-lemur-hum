import { NextRequest, NextResponse } from "next/server";
import { requireBearer } from "@/lib/auth-bearer";
import { supabaseAdmin } from "@/integrations/supabase/admin";

const SESSION_TTL_MS = 48 * 60 * 60 * 1000; // 48h lifecycle owned by PAL
const WARN_BEFORE_MS = 60 * 60 * 1000; // warn 1h before expiry

interface CreateSessionBody {
  category_id?: string;
  needs_credentials?: boolean;
  preset?: Record<string, unknown>;
  agent_id?: string;
}

interface SubdomainEmbed {
  id: string;
  prefix: string;
  domains: { domain_name: string } | null;
}

function randomCred(length: number): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  const authError = await requireBearer(req);
  if (authError) return authError;

  let body: CreateSessionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.category_id) {
    return NextResponse.json({ error: "Missing category_id" }, { status: 400 });
  }

  const { data: subRaw, error: subError } = await supabaseAdmin
    .from("subdomains")
    .select("id, prefix, domains(domain_name)")
    .eq("html_site_id", body.category_id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (subError) {
    console.error("[portals-sessions] Subdomain lookup failed:", subError.message);
    return NextResponse.json({ error: "Failed to resolve portal" }, { status: 500 });
  }

  const sub = subRaw as unknown as SubdomainEmbed | null;
  if (!sub) {
    return NextResponse.json(
      { error: "No active subdomain is linked to this category" },
      { status: 404 },
    );
  }

  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS);
  const warnAt = new Date(now + SESSION_TTL_MS - WARN_BEFORE_MS);

  const credentials = body.needs_credentials
    ? { username: `user_${randomCred(8)}`, password: randomCred(16) }
    : null;

  const { data: session, error: insertError } = await supabaseAdmin
    .from("sessions")
    .insert({
      subdomain_id: sub.id,
      status: "waiting",
      agent_id: body.agent_id ?? null,
      category_id: body.category_id,
      preset: body.preset ?? {},
      credentials: credentials ?? {},
      captures: {},
      autofill: {},
      expires_at: expiresAt.toISOString(),
      warn_at: warnAt.toISOString(),
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[portals-sessions] Insert failed:", insertError.message);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  const subdomain = sub.domains?.domain_name
    ? `${sub.prefix}.${sub.domains.domain_name}`
    : sub.prefix;

  return NextResponse.json({
    session_id: session.id,
    portal_url: `https://${subdomain}`,
    subdomain,
    ...(credentials ? { credentials } : {}),
    expires_at: expiresAt.toISOString(),
    warn_at: warnAt.toISOString(),
  });
}