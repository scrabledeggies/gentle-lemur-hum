import { NextRequest, NextResponse } from "next/server";
import { verifyHandshakeSecret } from "@/lib/pal-keys";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-handshake-secret");
  if (!secret) {
    return NextResponse.json(
      { error: "Missing x-handshake-secret header" },
      { status: 400 },
    );
  }

  const apiKey = await verifyHandshakeSecret(secret);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid handshake secret" }, { status: 401 });
  }

  return NextResponse.json({ palApiKey: apiKey });
}