CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id)
  END
$$;

CREATE OR REPLACE FUNCTION private.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN user_uuid IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = user_uuid
        AND environment = check_env
        AND (
          (status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > now()))
          OR (status = 'canceled' AND current_period_end > now())
          OR (status IN ('past_due','unpaid') AND (current_period_end IS NULL OR current_period_end > now() - interval '3 days'))
        )
    )
  END
$$;

REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_active_subscription(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_active_subscription(uuid, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins can view admin list" ON public.admin_users;
CREATE POLICY "Admins can view admin list" ON public.admin_users FOR SELECT TO authenticated USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can create articles" ON public.blog_articles;
CREATE POLICY "Admins can create articles" ON public.blog_articles FOR INSERT TO authenticated WITH CHECK (private.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can update articles" ON public.blog_articles;
CREATE POLICY "Admins can update articles" ON public.blog_articles FOR UPDATE TO authenticated USING (private.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete articles" ON public.blog_articles;
CREATE POLICY "Admins can delete articles" ON public.blog_articles FOR DELETE TO authenticated USING (private.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Members read published, admins read all" ON public.blog_articles;
CREATE POLICY "Members read published, admins read all" ON public.blog_articles FOR SELECT TO authenticated USING (published = true OR private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view form submissions" ON public.form_submissions;
CREATE POLICY "Admins can view form submissions" ON public.form_submissions FOR SELECT TO authenticated USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert app settings" ON public.app_settings;
CREATE POLICY "Admins can insert app settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (private.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
CREATE POLICY "Admins can update app settings" ON public.app_settings FOR UPDATE TO authenticated USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can read integration settings" ON public.integration_settings;
CREATE POLICY "Admins can read integration settings" ON public.integration_settings FOR SELECT TO authenticated USING (private.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can insert integration settings" ON public.integration_settings;
CREATE POLICY "Admins can insert integration settings" ON public.integration_settings FOR INSERT TO authenticated WITH CHECK (private.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can update integration settings" ON public.integration_settings;
CREATE POLICY "Admins can update integration settings" ON public.integration_settings FOR UPDATE TO authenticated USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

DROP FUNCTION IF EXISTS public.is_admin(uuid);
DROP FUNCTION IF EXISTS public.has_active_subscription(uuid, text);