CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS seats_used integer,
  ADD COLUMN IF NOT EXISTS seats_reported_at timestamptz;

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.cron_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO private.cron_config (key, value)
VALUES ('dunning', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.verify_cron_key(_name text, _value text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM private.cron_config
    WHERE key = _name AND value = _value
  );
$$;

REVOKE ALL ON FUNCTION public.verify_cron_key(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_key(text, text) TO service_role;

SELECT cron.unschedule('flexus-dunning-sweep')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'flexus-dunning-sweep');

SELECT cron.schedule(
  'flexus-dunning-sweep',
  '7 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--26205ede-bbe4-4e90-90d5-5be5b0db494b.lovable.app/api/public/payments/dunning',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', (SELECT value FROM private.cron_config WHERE key = 'dunning')
    ),
    body := '{"source":"pg_cron"}'::jsonb
  );
  $cron$
);