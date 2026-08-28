import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { requireBearer } from "@/lib/auth-bearer";

interface SyncTemplateBody {
  id?: string;
  name: string;
  subject: string;
  body: string;
}

export async function POST(req: NextRequest) {
  const authError = await requireBearer(req);
  if (authError) return authError;

  let payload: SyncTemplateBody;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, name, subject, body } = payload;

  if (!name || !subject || !body) {
    return NextResponse.json(
      { error: "Missing required fields: name, subject, body" },
      { status: 400 },
    );
  }

  if (id) {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("email_templates")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (lookupError) {
      console.error("[templates-sync] Failed to look up template:", lookupError.message);
      return NextResponse.json({ error: "Failed to look up template" }, { status: 500 });
    }

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("email_templates")
        .update({ name, subject, body, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[templates-sync] Failed to update template:", error.message);
        return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
      }

      return NextResponse.json(data);
    }
  }

  const { data, error } = await supabaseAdmin
    .from("email_templates")
    .insert({ name, subject, body })
    .select()
    .single();

  if (error) {
    console.error("[templates-sync] Failed to create template:", error.message);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }

  return NextResponse.json(data);
}