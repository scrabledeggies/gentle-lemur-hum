import { NextRequest, NextResponse } from "next/server";
import { verifyHandshakeSecret } from "@/lib/pal-keys";

export async function POST(req: NextRequest) {
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const apiKey = await verifyHandshakeSecret(body.code);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Invalid or already-used handshake code" },
      { status: 401 },
    );
  }

  return NextResponse.json({ api_key: apiKey });
}