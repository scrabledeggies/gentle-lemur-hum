ALTER TABLE public.pal_setup
  ADD COLUMN IF NOT EXISTS kc_connected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kc_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_ping_at timestamptz;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pal_setup TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pal_setup TO authenticated;