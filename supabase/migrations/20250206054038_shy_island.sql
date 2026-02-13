-- Drop existing functions first
DROP FUNCTION IF EXISTS increment_blog_views(text);
DROP FUNCTION IF EXISTS increment_classified_views(text);
DROP FUNCTION IF EXISTS increment_company_views(text);

-- Create increment_blog_views function
CREATE OR REPLACE FUNCTION increment_blog_views(slug_or_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE blog_posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id::text = slug_or_id OR slug = slug_or_id;
END;
$$;

-- Create increment_classified_views function
CREATE OR REPLACE FUNCTION increment_classified_views(slug_or_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE classifieds
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id::text = slug_or_id OR slug = slug_or_id;
END;
$$;

-- Create increment_company_views function
CREATE OR REPLACE FUNCTION increment_company_views(slug_or_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE mlm_companies
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id::text = slug_or_id OR slug = slug_or_id;
END;
$$;