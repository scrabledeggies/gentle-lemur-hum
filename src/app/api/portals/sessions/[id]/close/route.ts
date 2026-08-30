import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db-admin";
import { requirePalKey } from "@/lib/require-pal-key";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await requirePalKey(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = getAdminClient();

  const { error } = await admin
    .from("sessions")
    .update({ status: "ended", closed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[portals-session-close] Failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}