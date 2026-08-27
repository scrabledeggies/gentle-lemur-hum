import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const subdomain = host.split(".")[0];

  try {
    // Look up subdomain and get linked html_site
    const { data: sub, error: lookupError } = await supabaseAdmin
      .from("subdomains")
      .select("html_site_id, html_sites(storage_path)")
      .eq("prefix", subdomain)
      .maybeSingle();

    if (lookupError) throw lookupError;

    let html = `<html><body><h1>Portal not set up yet</h1></body></html>`;

    if (sub?.html_sites?.storage_path) {
      const { data: file, error: downloadError } = await supabaseAdmin.storage
        .from("portals")
        .download(sub.html_sites.storage_path);

      if (!downloadError && file) {
        html = await file.text();
      }
    }

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("[router] Error:", err);
    return new NextResponse(
      `<html><body><h1>Portal not set up yet</h1></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  }
}