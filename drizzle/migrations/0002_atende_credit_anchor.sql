ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS credit_anchor timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS credit_anchor_source text;
COMMENT ON COLUMN public.subscriptions.credit_anchor IS 'Aniversário imutável da franquia de créditos (Stripe start_date/billing_cycle_anchor ou início original da cortesia). NULL = não comprovado.';

CREATE OR REPLACE FUNCTION public.keep_credit_anchor()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.credit_anchor IS NOT NULL THEN
    NEW.credit_anchor := OLD.credit_anchor;
    NEW.credit_anchor_source := OLD.credit_anchor_source;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS keep_credit_anchor_trg ON public.subscriptions;
CREATE TRIGGER keep_credit_anchor_trg BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.keep_credit_anchor();

UPDATE public.subscriptions
   SET credit_anchor = current_period_start, credit_anchor_source = 'courtesy_period_start'
 WHERE is_courtesy = true AND credit_anchor IS NULL AND current_period_start IS NOT NULL
   AND stripe_subscription_id LIKE 'comp\_%';