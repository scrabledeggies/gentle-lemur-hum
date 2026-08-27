import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { requireBearer } from "@/lib/auth-bearer";

const SETUP_SQL = `
CREATE TABLE IF NOT EXISTS public.domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_name TEXT UNIQUE NOT NULL,
  max_subdomains INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS public.subdomains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL,
  html_site_id UUID,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.html_sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  category TEXT,
  storage_path TEXT NOT NULL,
  pages JSONB,
  autofill_fields JSONB
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

ALTER TABLE public.subdomains
  ADD CONSTRAINT fk_html_site
  FOREIGN KEY (html_site_id)
  REFERENCES public.html_sites(id)
  ON DELETE SET NULL;
`;

export async function POST(req: NextRequest) {
  const authError = requireBearer(req);
  if (authError) return authError;

  try {
    // Create tables via RPC if available, otherwise return SQL for manual run
    const { error: sqlError } = await supabaseAdmin.rpc("exec_sql", { sql: SETUP_SQL });
    if (sqlError) {
      // Fallback: return the SQL so user can run it manually
      return NextResponse.json({
        success: false,
        message: "exec_sql RPC not available. Run this SQL manually:",
        sql: SETUP_SQL,
      }, { status: 400 });
    }

    // Create storage bucket
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) throw listError;

    const bucketExists = buckets?.some((b) => b.name === "portals");
    if (!bucketExists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket("portals", {
        public: true,
      });
      if (createError) throw createError;
    }

    return NextResponse.json({ success: true, message: "Tables and bucket created" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[setup] Failed:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}