CREATE TABLE public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template text NOT NULL,
  recipient text NOT NULL,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL UNIQUE,
  reply_to text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  sent_at timestamptz,
  discard_reason text,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_queue_due ON public.email_queue (status, next_attempt_at);

GRANT SELECT ON public.email_queue TO authenticated;
GRANT ALL ON public.email_queue TO service_role;

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email queue"
  ON public.email_queue FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));

CREATE POLICY "Service role manages email queue"
  ON public.email_queue FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_email_queue_updated_at
  BEFORE UPDATE ON public.email_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cron_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer NOT NULL DEFAULT 0,
  ok boolean NOT NULL DEFAULT false,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cron_runs_job_started ON public.cron_runs (job, started_at DESC);

GRANT SELECT ON public.cron_runs TO authenticated;
GRANT ALL ON public.cron_runs TO service_role;

ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cron runs"
  ON public.cron_runs FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));

CREATE POLICY "Service role manages cron runs"
  ON public.cron_runs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');