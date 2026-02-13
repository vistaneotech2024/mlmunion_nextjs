-- Drop existing functions
DROP FUNCTION IF EXISTS increment_blog_views;
DROP FUNCTION IF EXISTS increment_classified_views;
DROP FUNCTION IF EXISTS increment_company_views;

-- Create updated increment_blog_views function
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

-- Create updated increment_classified_views function
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

-- Create updated increment_company_views function
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