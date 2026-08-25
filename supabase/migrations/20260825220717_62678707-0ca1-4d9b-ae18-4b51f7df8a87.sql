ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS is_courtesy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS courtesy_note text,
  ADD COLUMN IF NOT EXISTS granted_by uuid;

CREATE INDEX IF NOT EXISTS subscriptions_courtesy_idx
  ON public.subscriptions (is_courtesy, status);