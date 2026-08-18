ALTER TABLE public.blog_articles
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS unpublish_at timestamptz;

CREATE OR REPLACE FUNCTION public.apply_blog_schedule()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_articles
     SET published = true
   WHERE published = false
     AND publish_at IS NOT NULL
     AND publish_at <= now()
     AND (unpublish_at IS NULL OR unpublish_at > now());

  UPDATE public.blog_articles
     SET published = false
   WHERE published = true
     AND unpublish_at IS NOT NULL
     AND unpublish_at <= now();
END;
$$;

REVOKE ALL ON FUNCTION public.apply_blog_schedule() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_blog_schedule() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;