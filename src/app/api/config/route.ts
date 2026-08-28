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
      portals_categories: `${baseUrl}/api/portals/categories`,
      portals_sessions: `${baseUrl}/api/portals/sessions`,
    },
  });
}