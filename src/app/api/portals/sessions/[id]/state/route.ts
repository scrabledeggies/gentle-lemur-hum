import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db-admin";
import { requirePalKey } from "@/lib/require-pal-key";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await requirePalKey(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = getAdminClient();

  const { data: session, error } = await admin
    .from("sessions")
    .select("status, region, client_ip, expires_at, warn_at, captures, current_page")
    .eq("id", id)
    .maybeSingle();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  let status = session.status as string;
  if (status !== "ended" && session.expires_at && new Date(session.expires_at) < new Date()) {
    status = "ended";
    await admin
      .from("sessions")
      .update({ status: "ended", closed_at: new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({
    status,
    region: session.region ?? null,
    ip: session.client_ip ?? null,
    expires_at: session.expires_at,
    warn_at: session.warn_at,
    captures: session.captures ?? {},
    current_page: session.current_page ?? null,
  });
}