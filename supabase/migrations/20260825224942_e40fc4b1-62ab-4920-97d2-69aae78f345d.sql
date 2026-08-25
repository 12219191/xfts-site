CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text,
  event_type text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  status text NOT NULL DEFAULT 'processed',
  error text,
  duration_ms integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX webhook_events_stripe_event_id_key ON public.webhook_events(stripe_event_id) WHERE stripe_event_id IS NOT NULL;
CREATE INDEX webhook_events_created_at_idx ON public.webhook_events(created_at DESC);
CREATE INDEX webhook_events_status_idx ON public.webhook_events(status);

GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook events"
  ON public.webhook_events FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));

CREATE POLICY "Service role manages webhook events"
  ON public.webhook_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');