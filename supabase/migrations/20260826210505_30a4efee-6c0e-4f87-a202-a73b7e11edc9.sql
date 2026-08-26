-- 1) Registro de chamadas das integrações (SSO, entitlements, provisionamento)
CREATE TABLE public.integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_key text NOT NULL DEFAULT '',
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  http_status integer,
  reason text,
  error text,
  user_id uuid,
  duration_ms integer NOT NULL DEFAULT 0,
  environment text NOT NULL DEFAULT 'sandbox',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.integration_events TO authenticated;
GRANT ALL ON public.integration_events TO service_role;

ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view integration events"
  ON public.integration_events FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));

CREATE POLICY "Service role manages integration events"
  ON public.integration_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX integration_events_created_idx ON public.integration_events(created_at DESC);
CREATE INDEX integration_events_app_kind_idx ON public.integration_events(app_key, kind, created_at DESC);

-- 2) Fila de provisionamento com nova tentativa automática
CREATE TABLE public.provision_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  app_key text NOT NULL,
  event text NOT NULL,
  price_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.provision_queue TO authenticated;
GRANT ALL ON public.provision_queue TO service_role;

ALTER TABLE public.provision_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view provision queue"
  ON public.provision_queue FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));

CREATE POLICY "Service role manages provision queue"
  ON public.provision_queue FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX provision_queue_pending_idx
  ON public.provision_queue(next_attempt_at)
  WHERE status = 'pending';
CREATE INDEX provision_queue_created_idx ON public.provision_queue(created_at DESC);

CREATE TRIGGER update_provision_queue_updated_at
  BEFORE UPDATE ON public.provision_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Chave e agendamento do sweep de confiabilidade (a cada 5 minutos)
INSERT INTO private.cron_config (key, value)
VALUES ('reliability', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

SELECT cron.unschedule('flexus-reliability-sweep')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'flexus-reliability-sweep');

SELECT cron.schedule(
  'flexus-reliability-sweep',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--26205ede-bbe4-4e90-90d5-5be5b0db494b.lovable.app/api/public/provision-retry',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', (SELECT value FROM private.cron_config WHERE key = 'reliability')
    ),
    body := '{"source":"pg_cron"}'::jsonb
  );
  $cron$
);