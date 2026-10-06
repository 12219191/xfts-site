CREATE TABLE public.support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jti text NOT NULL UNIQUE,
  actor_id uuid NOT NULL,
  actor_email text NOT NULL,
  actor_name text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('XFTS_SUPPORT','XFTS_SUPERADMIN')),
  tenant_id uuid NOT NULL,
  app_key text NOT NULL,
  reason text NOT NULL,
  ticket text,
  environment text NOT NULL DEFAULT 'live',
  token_expires_at timestamptz NOT NULL,
  used_at timestamptz,
  session_expires_at timestamptz,
  ended_at timestamptz,
  ended_reason text CHECK (ended_reason IS NULL OR ended_reason IN ('ended','revoked','expired','replaced')),
  revoked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.support_sessions TO service_role;
ALTER TABLE public.support_sessions ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX support_sessions_one_open
  ON public.support_sessions (actor_id, tenant_id, app_key)
  WHERE ended_at IS NULL;
CREATE INDEX support_sessions_open_idx ON public.support_sessions (ended_at, session_expires_at);