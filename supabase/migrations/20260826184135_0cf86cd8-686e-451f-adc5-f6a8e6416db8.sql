ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS seats_override integer;