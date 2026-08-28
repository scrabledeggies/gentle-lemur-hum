import { NextRequest, NextResponse } from "next/server";
import { requireBearer } from "@/lib/auth-bearer";
import { supabaseAdmin } from "@/integrations/supabase/admin";

interface SitePage {
  id?: string;
  label?: string;
}

interface HtmlSiteEmbed {
  id: string;
  name: string | null;
  category: string | null;
  pages: (SitePage | string)[] | null;
  autofill_fields: unknown[] | null;
}

interface SubdomainRow {
  id: string;
  prefix: string;
  html_sites: HtmlSiteEmbed | null;
  domains: { domain_name: string } | null;
}

function toKeys(fields: unknown[] | null): string[] {
  if (!Array.isArray(fields)) return [];
  return fields
    .map((f) =>
      typeof f === "string" ? f : (f as { key?: string; name?: string })?.key ?? (f as { name?: string })?.name,
    )
    .filter((k): k is string => Boolean(k));
}

export async function GET(req: NextRequest) {
  const authError = await requireBearer(req);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from("subdomains")
    .select(
      "id, prefix, html_sites(id, name, category, pages, autofill_fields), domains(domain_name)",
    )
    .eq("status", "active")
    .not("html_site_id", "is", null);

  if (error) {
    console.error("[portals-categories] Query failed:", error.message);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }

  const categories = ((data as unknown as SubdomainRow[]) ?? [])
    .filter((row) => row.html_sites)
    .map((row) => {
      const site = row.html_sites!;
      const pages = Array.isArray(site.pages) ? site.pages : [];
      const keys = toKeys(site.autofill_fields);
      const domainSuffix = row.domains?.domain_name ? `.${row.domains.domain_name}` : "";

      return {
        id: site.id,
        name: site.name ?? row.prefix,
        subdomain: `${row.prefix}${domainSuffix}`,
        capabilities: ["autofill", "navigate", "capture"],
        autofill_keys: keys,
        capture_keys: keys,
        pages: pages.map((p, i) =>
          typeof p === "string"
            ? { id: p, label: p }
            : { id: p.id ?? `page-${i}`, label: p.label ?? p.id ?? `Page ${i + 1}` },
        ),
      };
    });

  return NextResponse.json(categories);
}