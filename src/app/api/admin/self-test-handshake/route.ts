import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { generateTestHandshakeCode } from "@/lib/pal-keys";

export async function POST(req: NextRequest) {
  const authorized = await requireAdmin(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const code = await generateTestHandshakeCode();
    return NextResponse.json({ handshake_code: code });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[self-test-handshake] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}