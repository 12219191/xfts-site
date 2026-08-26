ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_event_id text,
  ADD COLUMN IF NOT EXISTS last_event_created timestamptz;

CREATE INDEX IF NOT EXISTS webhook_events_type_env_idx
  ON public.webhook_events(event_type, environment, created_at DESC);