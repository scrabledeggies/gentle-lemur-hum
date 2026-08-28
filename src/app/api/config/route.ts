import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "http://localhost:3000";
  return NextResponse.json({
    baseUrl,
    health: "/health",
    outreach: "/outreach",
    portals: "/portals",
  });
}