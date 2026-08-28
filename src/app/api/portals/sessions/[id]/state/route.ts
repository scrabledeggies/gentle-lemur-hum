import { NextRequest, NextResponse } from "next/server";
import { requireBearer } from "@/lib/auth-bearer";
import { supabaseAdmin } from "@/integrations/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireBearer(req);
  if (authError) return authError;

  const { id } = await params;

  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .select(
      "status, region, client_ip, expires_at, warn_at, captures, current_page",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Lazy expiry: once expires_at passes, the session is ended.
  let status = session.status as string;
  if (
    status !== "ended" &&
    session.expires_at &&
    new Date(session.expires_at).getTime() <= Date.now()
  ) {
    status = "ended";
    await supabaseAdmin
      .from("sessions")
      .update({ status: "ended", closed_at: new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({
    status,
    region: session.region ?? null,
    ip: session.client_ip ?? null,
    expires_at: session.expires_at ?? null,
    warn_at: session.warn_at ?? null,
    captures: session.captures ?? {},
    current_page: session.current_page ?? null,
  });
}