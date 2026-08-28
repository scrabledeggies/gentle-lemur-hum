import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { requireUser } from "@/lib/require-user";

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const name = (formData.get("name") as string) || file.name;
    const category = (formData.get("category") as string) || null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("portals")
      .upload(path, buffer, { contentType: file.type || "text/html" });
    if (uploadError) throw uploadError;

    const { data: site, error: dbError } = await supabaseAdmin
      .from("html_sites")
      .insert({ name, category, storage_path: path, pages: [], autofill_fields: [] })
      .select()
      .single();
    if (dbError) throw dbError;

    return NextResponse.json({ success: true, site });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[admin-upload-site] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}