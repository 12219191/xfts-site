CREATE TABLE public.dunning_state (
  stripe_subscription_id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  price_id text,
  invoice_id text,
  amount_due numeric,
  failed_at timestamptz NOT NULL DEFAULT now(),
  grace_until timestamptz NOT NULL DEFAULT (now() + interval '5 days'),
  last_stage integer NOT NULL DEFAULT 0,
  resolved_at timestamptz,
  blocked_at timestamptz,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dunning_state TO authenticated;
GRANT ALL ON public.dunning_state TO service_role;
ALTER TABLE public.dunning_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dunning state"
  ON public.dunning_state FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));

CREATE POLICY "Service role manages dunning state"
  ON public.dunning_state FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_dunning_state_updated_at
  BEFORE UPDATE ON public.dunning_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dunning_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id text NOT NULL,
  user_id uuid,
  stage integer NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dunning_emails_sub ON public.dunning_emails(stripe_subscription_id);

GRANT SELECT ON public.dunning_emails TO authenticated;
GRANT ALL ON public.dunning_emails TO service_role;
ALTER TABLE public.dunning_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dunning emails"
  ON public.dunning_emails FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));

CREATE POLICY "Service role manages dunning emails"
  ON public.dunning_emails FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');