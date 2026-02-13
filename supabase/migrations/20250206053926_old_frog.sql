-- Drop existing functions first
DROP FUNCTION IF EXISTS increment_blog_views(text);
DROP FUNCTION IF EXISTS increment_classified_views(text);
DROP FUNCTION IF EXISTS increment_company_views(text);

-- Create increment_blog_views function
CREATE OR REPLACE FUNCTION increment_blog_views(slug_or_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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
STABLE
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
STABLE
SET search_path = public
AS $$
BEGIN
  UPDATE mlm_companies
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id::text = slug_or_id OR slug = slug_or_id;
END;
$$;

-- Ensure view_count columns exist and have default values
DO $$ 
BEGIN
  -- For blog_posts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN view_count integer DEFAULT 0;
  END IF;

  -- For classifieds
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classifieds' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE classifieds ADD COLUMN view_count integer DEFAULT 0;
  END IF;

  -- For mlm_companies
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mlm_companies' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE mlm_companies ADD COLUMN view_count integer DEFAULT 0;
  END IF;
END $$;

-- Ensure indexes exist for better performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug_id ON blog_posts(id, slug);
CREATE INDEX IF NOT EXISTS idx_classifieds_slug_id ON classifieds(id, slug);
CREATE INDEX IF NOT EXISTS idx_mlm_companies_slug_id ON mlm_companies(id, slug);