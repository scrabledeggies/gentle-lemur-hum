import { NextResponse } from "next/server";

export async function GET() {
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const baseUrl = vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";

  return NextResponse.json({
    endpoints: {
      health: `${baseUrl}/health`,
      outreach: `${baseUrl}/outreach`,
      portals: `${baseUrl}/api/portals`,
      sms: `${baseUrl}/sms`,
      voice: `${baseUrl}/voice`,
    },
    service: "pal",
    version: "1.0.0",
  });
}