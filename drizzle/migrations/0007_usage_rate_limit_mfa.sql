CREATE TABLE public.api_rate_limits (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
GRANT ALL ON public.api_rate_limits TO service_role;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.hit_rate_limit(_bucket text, _limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w timestamptz := date_trunc('minute', now()); c integer;
BEGIN
  INSERT INTO public.api_rate_limits(bucket, window_start, count) VALUES (_bucket, w, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET count = api_rate_limits.count + 1
  RETURNING count INTO c;
  DELETE FROM public.api_rate_limits WHERE window_start < now() - interval '10 minutes';
  RETURN c <= _limit;
END $$;
REVOKE ALL ON FUNCTION public.hit_rate_limit(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(text, integer) TO service_role;

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS seats_reported_ts timestamptz;

CREATE TABLE public.admin_mfa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_mfa_recovery_codes TO authenticated;
GRANT ALL ON public.admin_mfa_recovery_codes TO service_role;
ALTER TABLE public.admin_mfa_recovery_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recovery codes metadata" ON public.admin_mfa_recovery_codes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.integration_settings(key, value) VALUES
  ('flow.admin_preview_access', 'true'::jsonb),
  ('mfa.enforce_after', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;