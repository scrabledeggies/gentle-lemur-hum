import { NextRequest, NextResponse } from "next/server";
import { requireBearer } from "@/lib/auth-bearer";
import { supabaseAdmin } from "@/integrations/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireBearer(req);
  if (authError) return authError;

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("sessions")
    .update({ status: "ended", closed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[session-close] Update failed:", error.message);
    return NextResponse.json({ error: "Failed to close session" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}