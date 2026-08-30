import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db-admin";
import { requirePalKey } from "@/lib/require-pal-key";

interface HtmlSitePage {
  id: string;
  label: string;
}

export async function GET(req: NextRequest) {
  const authorized = await requirePalKey(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();

  const { data: subdomains, error: subError } = await admin
    .from("subdomains")
    .select("id, prefix, domain_id, html_site_id")
    .eq("status", "active");

  if (subError) {
    console.error("[portals-categories] Failed to load subdomains:", subError.message);
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  if (!subdomains || subdomains.length === 0) {
    return NextResponse.json([]);
  }

  const domainIds = [...new Set(subdomains.map((s) => s.domain_id).filter(Boolean))];
  const siteIds = [...new Set(subdomains.map((s) => s.html_site_id).filter(Boolean))];

  const { data: domains } = await admin
    .from("domains")
    .select("id, domain_name")
    .in("id", domainIds.length > 0 ? domainIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: sites } = await admin
    .from("html_sites")
    .select("id, name, category, pages, autofill_fields")
    .in("id", siteIds.length > 0 ? siteIds : ["00000000-0000-0000-0000-000000000000"]);

  const domainMap = new Map((domains ?? []).map((d) => [d.id, d.domain_name as string]));
  const siteMap = new Map((sites ?? []).map((s) => [s.id, s]));

  const categories = subdomains
    .filter((s) => s.html_site_id && siteMap.has(s.html_site_id))
    .map((s) => {
      const site = siteMap.get(s.html_site_id as string)!;
      const domainName = s.domain_id ? domainMap.get(s.domain_id) : undefined;
      const pages = (site.pages as HtmlSitePage[] | null) ?? [];
      const autofillFields = (site.autofill_fields as string[] | null) ?? [];

      return {
        id: s.id,
        name: site.name ?? site.category ?? "Untitled",
        subdomain: domainName ? `${s.prefix}.${domainName}` : s.prefix,
        capabilities: ["autofill", "navigate", "state"],
        autofill_keys: autofillFields,
        capture_keys: autofillFields,
        pages,
      };
    });

  return NextResponse.json(categories);
}