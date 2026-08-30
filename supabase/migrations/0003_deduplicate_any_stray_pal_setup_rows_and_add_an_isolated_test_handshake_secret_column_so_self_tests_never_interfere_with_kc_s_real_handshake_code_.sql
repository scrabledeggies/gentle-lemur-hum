-- Keep only the earliest pal_setup row if duplicates ever crept in
DELETE FROM public.pal_setup
WHERE id NOT IN (
  SELECT id FROM public.pal_setup ORDER BY created_at ASC LIMIT 1
);

-- Add an isolated secret used only by PAL's own self-test tool
ALTER TABLE public.pal_setup ADD COLUMN IF NOT EXISTS test_handshake_secret TEXT;

UPDATE public.pal_setup
SET test_handshake_secret = md5(random()::text || clock_timestamp()::text)
WHERE test_handshake_secret IS NULL;