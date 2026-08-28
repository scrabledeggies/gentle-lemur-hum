import { NextResponse } from "next/server";

export async function GET() {
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const baseUrl = vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";

  return NextResponse.json({
    endpoints: {
      health: `${baseUrl}/health`,
      outreach: `${baseUrl}/outreach`,
      sms: `${baseUrl}/sms`,
      voice: `${baseUrl}/voice`,
      freestyle: `${baseUrl}/freestyle`,
      email_send: `${baseUrl}/email/send`,
      relays_next_healthy: `${baseUrl}/relays/next-healthy`,
      senders: `${baseUrl}/senders`,
      templates_sync: `${baseUrl}/templates/sync`,
      portals_categories: `${baseUrl}/portals/categories`,
      portals_sessions: `${baseUrl}/portals/sessions`,
      portals_upload: `${baseUrl}/portals/upload`,
    },
  });
}