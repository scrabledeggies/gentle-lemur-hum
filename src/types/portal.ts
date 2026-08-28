export interface PortalDomain {
  id: string;
  domain_name: string;
  max_subdomains: number;
}

export interface HtmlSite {
  id: string;
  name: string | null;
  category: string | null;
  storage_path: string;
  pages: { id: string; label: string }[] | null;
  autofill_fields: unknown[] | null;
}

export interface PortalSubdomain {
  id: string;
  domain_id: string | null;
  prefix: string;
  html_site_id: string | null;
  status: "active" | "suspended";
  domains?: { domain_name: string } | null;
  html_sites?: { name: string | null } | null;
}

export interface PortalSession {
  id: string;
  subdomain_id: string | null;
  status: "waiting" | "active" | "ended";
  client_ip: string | null;
  region?: string | null;
  current_page?: string | null;
  captures?: Record<string, unknown>;
  expires_at?: string | null;
  warn_at?: string | null;
  created_at: string;
  closed_at: string | null;
  subdomains?: {
    prefix: string;
    domains?: { domain_name: string } | null;
  } | null;
}

export interface IpBan {
  id: string;
  ip: string;
  subdomain_id: string | null;
  banned_at: string;
  expires_at: string | null;
}