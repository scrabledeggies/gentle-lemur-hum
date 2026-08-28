import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { requireBearer } from "@/lib/auth-bearer";

const SETUP_SQL = `
CREATE TABLE IF NOT EXISTS public.domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_name TEXT UNIQUE NOT NULL,
  max_subdomains INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS public.html_sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  category TEXT,
  storage_path TEXT NOT NULL,
  pages JSONB,
  autofill_fields JSONB
);

CREATE TABLE IF NOT EXISTS public.subdomains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL,
  html_site_id UUID REFERENCES public.html_sites(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subdomain_id UUID REFERENCES public.subdomains(id),
  user_id UUID,
  status TEXT DEFAULT 'open',
  client_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  client_info JSONB,
  credentials JSONB
);

CREATE TABLE IF NOT EXISTS public.bans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip TEXT NOT NULL,
  subdomain_id UUID REFERENCES public.subdomains(id),
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);
`;

export async function POST(req: NextRequest) {
  const authError = requireBearer(req);
  if (authError) return authError;

  let bucketStatus = "created";
  try {
    const { error } = await supabaseAdmin.storage.createBucket("portals", {
      public: true,
    });
    if (error) {
      bucketStatus = error.message.includes("already exists")
        ? "already existed"
        : `error: ${error.message}`;
    }
  } catch (err) {
    bucketStatus = `error: ${err instanceof Error ? err.message : "unknown"}`;
  }

  return NextResponse.json({
    success: true,
    bucket: bucketStatus,
    message: "Run the SQL in the `sql` field in your Supabase SQL editor to create the portal tables.",
    sql: SETUP_SQL,
  });
}