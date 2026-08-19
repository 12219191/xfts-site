ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS lt_utm_source text,
  ADD COLUMN IF NOT EXISTS lt_utm_medium text,
  ADD COLUMN IF NOT EXISTS lt_utm_campaign text,
  ADD COLUMN IF NOT EXISTS lt_utm_term text,
  ADD COLUMN IF NOT EXISTS lt_utm_content text,
  ADD COLUMN IF NOT EXISTS lt_referrer text,
  ADD COLUMN IF NOT EXISTS lt_landing_page text;