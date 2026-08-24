import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { isValidApiKey } from "@/lib/api-auth";

interface SendEmailRequestBody {
  to: string;
  from: string;
  subject: string;
  body: string;
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

async function logEmailAttempt(params: {
  relayId: string | null;
  to: string;
  subject: string;
  status: "success" | "failed";
  errorMessage: string | null;
}) {
  const { error } = await supabaseAdmin.from("email_log").insert({
    relay_id: params.relayId,
    to: params.to,
    subject: params.subject,
    status: params.status,
    error_message: params.errorMessage,
  });

  if (error) {
    console.error("[email-send] Failed to write email_log entry:", error.message);
  }
}

export async function POST(req: NextRequest) {
  if (!isValidApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SendEmailRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { to, from, subject, body: emailBody } = body;

  if (!to || !from || !subject || !emailBody) {
    return NextResponse.json(
      { error: "Missing required fields: to, from, subject, body" },
      { status: 400 },
    );
  }

  const { data: relays, error: relayError } = await supabaseAdmin.rpc(
    "get_next_healthy_relay",
  );

  if (relayError) {
    console.error("[email-send] Failed to fetch healthy relay:", relayError.message);
    await logEmailAttempt({
      relayId: null,
      to,
      subject,
      status: "failed",
      errorMessage: "Failed to look up a healthy relay",
    });
    return NextResponse.json({ error: "Failed to select relay" }, { status: 500 });
  }

  const relay = (relays as HealthyRelay[] | null)?.[0];

  if (!relay) {
    await logEmailAttempt({
      relayId: null,
      to,
      subject,
      status: "failed",
      errorMessage: "No healthy relay available with remaining daily capacity",
    });
    return NextResponse.json({ error: "No healthy relay available" }, { status: 503 });
  }

  const transporter = nodemailer.createTransport({
    host: relay.host,
    port: relay.port,
    secure: relay.port === 465,
    auth: {
      user: relay.username,
      pass: relay.password,
    },
  });

  try {
    await transporter.sendMail({
      to,
      from,
      subject,
      html: emailBody,
    });

    await supabaseAdmin
      .from("smtp_relays")
      .update({
        sent_today: relay.sent_today + 1,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", relay.id);

    await logEmailAttempt({
      relayId: relay.id,
      to,
      subject,
      status: "success",
      errorMessage: null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error sending email";
    console.error("[email-send] Failed to send email:", message);

    await logEmailAttempt({
      relayId: relay.id,
      to,
      subject,
      status: "failed",
      errorMessage: message,
    });

    return NextResponse.json({ error: "Failed to send email" }, { status: 502 });
  }
}