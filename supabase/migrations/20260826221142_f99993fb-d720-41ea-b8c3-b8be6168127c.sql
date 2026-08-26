ALTER TABLE public.catalog_plans ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0;

CREATE TABLE public.account_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_email text,
  app_key text NOT NULL,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  note text,
  accepted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamp with time zone,
  revoked_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  environment text NOT NULL DEFAULT 'live',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.account_invites TO authenticated;
GRANT ALL ON public.account_invites TO service_role;

ALTER TABLE public.account_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Titular ve os convites da propria conta"
  ON public.account_invites FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE UNIQUE INDEX account_invites_pending_unique
  ON public.account_invites (owner_user_id, app_key, lower(email))
  WHERE status = 'pending';

CREATE INDEX account_invites_email_idx ON public.account_invites (lower(email));

CREATE TRIGGER update_account_invites_updated_at
  BEFORE UPDATE ON public.account_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();