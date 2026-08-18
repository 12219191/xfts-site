CREATE POLICY "Admins can upload blog images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'blog-images' AND EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

CREATE POLICY "Admins can update blog images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'blog-images' AND EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

CREATE POLICY "Admins can delete blog images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'blog-images' AND EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

CREATE POLICY "Admins can view blog images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'blog-images' AND EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));