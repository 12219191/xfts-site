CREATE TABLE public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id text NOT NULL,
  form_type text NOT NULL,
  tela text NOT NULL DEFAULT '',
  status text NOT NULL,
  http_status integer,
  duration_ms integer NOT NULL DEFAULT 0,
  nome text,
  email text,
  telefone text,
  segmento text,
  empresa text,
  assunto text,
  mensagem text,
  source text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX form_submissions_created_at_idx ON public.form_submissions (created_at DESC);
CREATE INDEX form_submissions_reference_id_idx ON public.form_submissions (reference_id);

GRANT SELECT ON public.form_submissions TO authenticated;
GRANT ALL ON public.form_submissions TO service_role;

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view form submissions"
  ON public.form_submissions FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role manages form submissions"
  ON public.form_submissions FOR ALL
  USING (auth.role() = 'service_role');