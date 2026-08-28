import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { requireBearer } from "@/lib/auth-bearer";

export async function POST(req: NextRequest) {
  const authError = await requireBearer(req);
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("portals")
      .upload(path, buffer, { contentType: file.type || "text/html" });

    if (uploadError) throw uploadError;

    const { data: site, error: dbError } = await supabaseAdmin
      .from("html_sites")
      .insert({
        name: file.name,
        storage_path: path,
        pages: [],
        autofill_fields: [],
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, siteId: site.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[upload] Failed:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}