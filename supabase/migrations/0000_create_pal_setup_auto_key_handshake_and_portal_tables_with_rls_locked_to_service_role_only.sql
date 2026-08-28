CREATE TABLE IF NOT EXISTS public.pal_setup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL,
  handshake_secret TEXT NOT NULL,
  handshake_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON TABLE public.pal_setup TO service_role;
ALTER TABLE public.pal_setup ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_name TEXT UNIQUE NOT NULL,
  max_subdomains INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS public.html_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  category TEXT,
  storage_path TEXT NOT NULL,
  pages JSONB DEFAULT '[]'::jsonb,
  autofill_fields JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.subdomains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES public.domains(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL,
  html_site_id UUID REFERENCES public.html_sites(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain_id UUID REFERENCES public.subdomains(id) ON DELETE CASCADE,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  client_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  client_info JSONB DEFAULT '{}'::jsonb,
  credentials JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  subdomain_id UUID REFERENCES public.subdomains(id) ON DELETE CASCADE,
  banned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.domains TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.html_sites TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subdomains TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.presets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bans TO service_role;

ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.html_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subdomains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;