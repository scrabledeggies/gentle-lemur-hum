import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getHandshakeSecret, rotateHandshakeSecret } from "@/lib/pal-keys";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const code = await getHandshakeSecret();
    return NextResponse.json({ handshake_code: code });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[setup-info] GET failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const code = await rotateHandshakeSecret();
    return NextResponse.json({ handshake_code: code });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[setup-info] POST failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
