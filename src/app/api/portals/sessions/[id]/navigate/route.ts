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

  let body: { page_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.page_id) {
    return NextResponse.json({ error: "Missing page_id" }, { status: 400 });
  }

  const admin = getAdminClient();

  const { error } = await admin
    .from("sessions")
    .update({ current_page: body.page_id, status: "active" })
    .eq("id", id);

  if (error) {
    console.error("[portals-session-navigate] Failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}