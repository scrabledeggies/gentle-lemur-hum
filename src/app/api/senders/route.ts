import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { requireBearer } from "@/lib/auth-bearer";

export async function GET(req: NextRequest) {
  const authError = await requireBearer(req);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from("sender_identities")
    .select("id, display_name, from_email")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) {
    console.error("[senders] Failed to fetch senders:", error.message);
    return NextResponse.json({ error: "Failed to fetch senders" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}