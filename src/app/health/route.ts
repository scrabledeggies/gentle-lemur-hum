import { NextRequest, NextResponse } from "next/server";
import { requirePalKey } from "@/lib/require-pal-key";

export async function GET(req: NextRequest) {
  const authorized = await requirePalKey(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}