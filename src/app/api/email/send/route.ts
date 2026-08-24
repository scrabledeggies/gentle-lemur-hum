import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { isValidApiKey } from "@/lib/api-auth";

interface SendEmailRequestBody {
  to: string;
  from?: string;
  subject: string;
  body: string;
  sender_id?: string;
  custom_sender_name?: string;
  template_id?: string;
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

const DEFAULT_FROM_EMAIL = process.env.DEFAULT_FROM_EMAIL || "noreply@pal.internal";

async function logEmailAttempt(params: {
  relayId: string | null;
  templateId: string | null;
  to: string;
  subject: string;
  status: "success" | "failed";
  errorMessage: string | null;
}) {
  const { error } = await supabaseAdmin.from("email_log").insert({
    relay_id: params.relayId,
    template_id: params.templateId,
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

  const { to, from, subject, body: emailBody, sender_id, custom_sender_name, template_id } = body;

  if (!to || !subject || !emailBody) {
    return NextResponse.json(
      { error: "Missing required fields: to, subject, body" },
      { status: 400 },
    );
  }

  // Resolve the From header: sender_id > custom_sender_name > from
  let fromHeader: string;

  if (sender_id) {
    const { data: sender, error: senderError } = await supabaseAdmin
      .from("sender_identities")
      .select("display_name, from_email")
      .eq("id", sender_id)
      .maybeSingle();

    if (senderError || !sender) {
      await logEmailAttempt({
        relayId: null,
        templateId: template_id ?? null,
        to,
        subject,
        status: "failed",
        errorMessage: "Invalid sender_id: sender identity not found",
      });
      return NextResponse.json({ error: "Invalid sender_id" }, { status: 400 });
    }

    fromHeader = `${sender.display_name} <${sender.from_email}>`;
  } else if (custom_sender_name) {
    fromHeader = `${custom_sender_name} <${DEFAULT_FROM_EMAIL}>`;
  } else if (from) {
    fromHeader = from;
  } else {
    return NextResponse.json(
      { error: "Provide one of: from, sender_id, or custom_sender_name" },
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
      templateId: template_id ?? null,
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
      templateId: template_id ?? null,
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
      from: fromHeader,
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
      templateId: template_id ?? null,
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
      templateId: template_id ?? null,
      to,
      subject,
      status: "failed",
      errorMessage: message,
    });

    return NextResponse.json({ error: "Failed to send email" }, { status: 502 });
  }
}