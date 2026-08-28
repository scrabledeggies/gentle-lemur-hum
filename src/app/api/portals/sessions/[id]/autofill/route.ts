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

  let body: { key?: string; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const { data: session, error: readError } = await supabaseAdmin
    .from("sessions")
    .select("autofill")
    .eq("id", id)
    .maybeSingle();

  if (readError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const autofill = {
    ...((session.autofill as Record<string, unknown>) ?? {}),
    [body.key]: body.value ?? "",
  };

  const { error } = await supabaseAdmin
    .from("sessions")
    .update({ autofill })
    .eq("id", id);

  if (error) {
    console.error("[session-autofill] Update failed:", error.message);
    return NextResponse.json({ error: "Failed to store autofill" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}