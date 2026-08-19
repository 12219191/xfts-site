-- Harden SECURITY DEFINER functions with in-function caller checks
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id)
  END
$function$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live'::text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN user_uuid IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = user_uuid
        AND environment = check_env
        AND (
          (status IN ('active', 'trialing') AND (current_period_end IS NULL OR current_period_end > now()))
          OR (status = 'canceled' AND current_period_end > now())
          OR (status IN ('past_due', 'unpaid') AND (current_period_end IS NULL OR current_period_end > now() - interval '3 days'))
        )
    )
  END
$function$;

REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.apply_blog_schedule() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_blog_schedule() TO service_role;

-- form_submissions: writes are server-side only (service role)
REVOKE INSERT, UPDATE, DELETE ON public.form_submissions FROM anon, authenticated;
REVOKE ALL ON public.form_submissions FROM anon;
GRANT SELECT ON public.form_submissions TO authenticated;
GRANT ALL ON public.form_submissions TO service_role;

DROP POLICY IF EXISTS "Service role manages form submissions" ON public.form_submissions;
CREATE POLICY "Service role manages form submissions"
  ON public.form_submissions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');