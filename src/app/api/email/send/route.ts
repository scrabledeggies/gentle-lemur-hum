import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { requireBearer } from "@/lib/auth-bearer";

interface SendEmailBody {
  to: string;
  from: string;
  subject: string;
  body: string;
  domain?: string;
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
  const authError = requireBearer(req);
  if (authError) return authError;

  let payload: SendEmailBody;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { to, from, subject, body } = payload;
  if (!to || !from || !subject || !body) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: to, from, subject, body" },
      { status: 400 },
    );
  }

  // Pick healthy relay
  const { data: relays, error: rpcError } = await supabaseAdmin.rpc("get_next_healthy_relay");
  if (rpcError) {
    console.error("[email-send] RPC failed:", rpcError.message);
    return NextResponse.json({ success: false, error: "Failed to pick relay" }, { status: 500 });
  }

  const relay = (relays as HealthyRelay[] | null)?.[0];
  if (!relay) {
    return NextResponse.json({ success: false, error: "No healthy relay available" }, { status: 503 });
  }

  const transporter = nodemailer.createTransport({
    host: relay.host,
    port: relay.port,
    secure: relay.port === 465,
    auth: { user: relay.username, pass: relay.password },
  });

  try {
    const info = await transporter.sendMail({ to, from, subject, html: body });

    // Increment usage counter
    await supabaseAdmin
      .from("smtp_relays")
      .update({
        sent_today: relay.sent_today + 1,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", relay.id);

    // Log success
    await supabaseAdmin.from("email_log").insert({
      relay_id: relay.id,
      to,
      subject,
      status: "success",
      error_message: null,
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email-send] Send failed:", message);

    await supabaseAdmin.from("email_log").insert({
      relay_id: relay.id,
      to,
      subject,
      status: "failed",
      error_message: message,
    });

    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}