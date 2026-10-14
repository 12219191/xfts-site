ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS gbraid text,
  ADD COLUMN IF NOT EXISTS wbraid text,
  ADD COLUMN IF NOT EXISTS li_fat_id text,
  ADD COLUMN IF NOT EXISTS fbc text,
  ADD COLUMN IF NOT EXISTS fbp text,
  ADD COLUMN IF NOT EXISTS lt_gbraid text,
  ADD COLUMN IF NOT EXISTS lt_wbraid text,
  ADD COLUMN IF NOT EXISTS lt_li_fat_id text;