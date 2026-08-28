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

  let body: { page_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.page_id) {
    return NextResponse.json({ error: "Missing page_id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("sessions")
    .update({ current_page: body.page_id })
    .eq("id", id);

  if (error) {
    console.error("[session-navigate] Update failed:", error.message);
    return NextResponse.json({ error: "Failed to navigate session" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}