DROP POLICY IF EXISTS "Published articles are public" ON public.blog_articles;

CREATE POLICY "Anyone can read published articles"
  ON public.blog_articles FOR SELECT
  TO anon
  USING (published = true);

CREATE POLICY "Members read published, admins read all"
  ON public.blog_articles FOR SELECT
  TO authenticated
  USING (published = true OR public.is_admin(auth.uid()));

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;