import { NextRequest, NextResponse } from "next/server";
import { verifyHandshakeSecret } from "@/lib/pal-keys";

export async function POST(req: NextRequest) {
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = body.code;
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const apiKey = await verifyHandshakeSecret(code);
    if (!apiKey) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
    }
    return NextResponse.json({ api_key: apiKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[handshake] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}