ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS preset jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS credentials jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS captures jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS autofill jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS warn_at timestamptz,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS current_page text;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sessions TO service_role;