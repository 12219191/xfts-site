ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS crm_status text NOT NULL DEFAULT 'skipped',
  ADD COLUMN IF NOT EXISTS crm_lead_id text,
  ADD COLUMN IF NOT EXISTS crm_error text,
  ADD COLUMN IF NOT EXISTS crm_synced_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS crm_attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS form_submissions_crm_status_idx
  ON public.form_submissions (crm_status, created_at DESC);