CREATE TABLE public.sso_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jti text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_key text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX sso_tokens_expires_at_idx ON public.sso_tokens (expires_at);

GRANT ALL ON public.sso_tokens TO service_role;

ALTER TABLE public.sso_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages sso tokens"
  ON public.sso_tokens FOR ALL
  USING (auth.role() = 'service_role');