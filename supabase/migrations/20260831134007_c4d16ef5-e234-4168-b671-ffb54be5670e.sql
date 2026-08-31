DROP POLICY IF EXISTS "App settings are public" ON public.app_settings;

CREATE POLICY "Public can read attribution setting only"
  ON public.app_settings FOR SELECT
  TO anon, authenticated
  USING (key = 'attribution');

CREATE POLICY "Admins can read all app settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()));