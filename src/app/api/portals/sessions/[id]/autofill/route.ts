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

  let body: { key?: string; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const admin = getAdminClient();

  const { data: session, error: fetchError } = await admin
    .from("sessions")
    .select("autofill")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const updatedAutofill = {
    ...((session.autofill as Record<string, unknown>) ?? {}),
    [body.key]: body.value,
  };

  const { error: updateError } = await admin
    .from("sessions")
    .update({ autofill: updatedAutofill })
    .eq("id", id);

  if (updateError) {
    console.error("[portals-session-autofill] Failed:", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}