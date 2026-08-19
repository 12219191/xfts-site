ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS gclid text,
  ADD COLUMN IF NOT EXISTS fbclid text,
  ADD COLUMN IF NOT EXISTS lt_gclid text,
  ADD COLUMN IF NOT EXISTS lt_fbclid text;