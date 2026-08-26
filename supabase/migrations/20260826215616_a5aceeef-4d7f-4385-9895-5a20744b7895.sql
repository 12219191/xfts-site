CREATE TABLE public.finance_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_refund_id text NOT NULL,
  stripe_charge_id text NOT NULL,
  stripe_invoice_id text,
  user_id uuid,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  environment text NOT NULL DEFAULT 'live',
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_finance_refunds_refund_id ON public.finance_refunds (stripe_refund_id);
CREATE INDEX idx_finance_refunds_env_created ON public.finance_refunds (environment, created_at DESC);

GRANT SELECT ON public.finance_refunds TO authenticated;
GRANT ALL ON public.finance_refunds TO service_role;

ALTER TABLE public.finance_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view refunds"
  ON public.finance_refunds FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));

CREATE POLICY "Service role manages refunds"
  ON public.finance_refunds FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');