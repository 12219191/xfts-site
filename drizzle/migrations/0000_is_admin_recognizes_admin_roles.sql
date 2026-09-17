CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE (
      EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id)
      OR EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE user_id = _user_id
          AND role IN ('superadmin'::public.admin_role, 'produto'::public.admin_role)
      )
    )
  END
$function$;

DROP POLICY IF EXISTS "Admins can view blog images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete blog images" ON storage.objects;

CREATE POLICY "Admins can view blog images" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images' AND private.is_admin(auth.uid()));
CREATE POLICY "Admins can upload blog images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'blog-images' AND private.is_admin(auth.uid()));
CREATE POLICY "Admins can update blog images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'blog-images' AND private.is_admin(auth.uid()));
CREATE POLICY "Admins can delete blog images" ON storage.objects
  FOR DELETE USING (bucket_id = 'blog-images' AND private.is_admin(auth.uid()));