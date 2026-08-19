ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS cta_id text,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS cta_page text;