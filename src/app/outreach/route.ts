import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getAdminClient } from "@/lib/db-admin";
import { requirePalKey } from "@/lib/require-pal-key";

interface OutreachEnvelope {
  module: string;
  action: string;
  dry_run?: boolean;
  agent_id?: string;
  freestyle?: Record<string, unknown>;
  payload?: {
    from?: string;
    to?: string;
    subject?: string;
    html?: string;
    dry_run?: boolean;
  };
}

interface HealthyRelay {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  daily_limit: number;
  sent_today: number;
}

export async function POST(req: NextRequest) {
  const authorized = await requirePalKey(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: OutreachEnvelope;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  // Diagnostic/dry-run ping: echo back success without touching the
  // database or sending any real email.
  if (body.action === "ping" || body.dry_run === true || body.payload?.dry_run === true) {
    console.log("[outreach] Dry-run ping received", body);
    return NextResponse.json({ ok: true, dry_run: true, module: "outreach" });
  }

  if (body.action !== "send") {
    return NextResponse.json(
      { ok: false, error: `Unsupported action: ${body.action}` },
      { status: 400 },
    );
  }

  const { to, subject, html, from } = body.payload ?? {};
  if (!to || !subject || !html) {
    return NextResponse.json(
      { ok: false, error: "Missing to, subject, or html in payload" },
      { status: 400 },
    );
  }

  const admin = getAdminClient();

  const { data: relay, error: relayError } = await admin
    .rpc("get_next_healthy_relay")
    .single();

  if (relayError || !relay) {
    console.error("[outreach] No healthy relay available:", relayError?.message);
    return NextResponse.json(
      { ok: false, error: "No healthy SMTP relay available" },
      { status: 503 },
    );
  }

  const r = relay as HealthyRelay;

  try {
    const transporter = nodemailer.createTransport({
      host: r.host,
      port: r.port,
      secure: r.port === 465,
      auth: { user: r.username, pass: r.password },
    });

    const info = await transporter.sendMail({
      from: from || r.username,
      to,
      subject,
      html,
    });

    await admin
      .from("smtp_relays")
      .update({ sent_today: r.sent_today + 1, last_used_at: new Date().toISOString() })
      .eq("id", r.id);

    await admin.from("email_log").insert({
      relay_id: r.id,
      to,
      subject,
      status: "sent",
    });

    return NextResponse.json({ ok: true, provider_id: info.messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    console.error("[outreach] Send failed:", message);

    await admin.from("email_log").insert({
      relay_id: r.id,
      to,
      subject,
      status: "failed",
      error_message: message,
    });

    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}