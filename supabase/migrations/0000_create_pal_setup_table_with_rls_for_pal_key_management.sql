CREATE TABLE IF NOT EXISTS public.pal_setup (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key TEXT NOT NULL,
  handshake_secret TEXT NOT NULL,
  handshake_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pal_setup ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pal_setup TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pal_setup TO authenticated;

CREATE POLICY "Allow full access to authenticated users" ON public.pal_setup
FOR ALL TO authenticated USING (true) WITH CHECK (true);