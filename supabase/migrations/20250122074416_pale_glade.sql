-- Drop existing trigger function
DROP FUNCTION IF EXISTS generate_slug_trigger CASCADE;

-- Create updated trigger function
CREATE OR REPLACE FUNCTION generate_slug_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate slug if it's NULL and we have a title/name
  IF NEW.slug IS NULL AND (
    (TG_TABLE_NAME = 'blog_posts' AND NEW.title IS NOT NULL) OR
    (TG_TABLE_NAME = 'mlm_companies' AND NEW.name IS NOT NULL) OR
    (TG_TABLE_NAME = 'classifieds' AND NEW.title IS NOT NULL)
  ) THEN
    NEW.slug := generate_unique_slug(
      CASE TG_TABLE_NAME
        WHEN 'blog_posts' THEN NEW.title
        WHEN 'mlm_companies' THEN NEW.name
        WHEN 'classifieds' THEN NEW.title
      END,
      TG_TABLE_NAME
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate triggers with better conditions
DROP TRIGGER IF EXISTS blog_posts_slug_trigger ON blog_posts;
CREATE TRIGGER blog_posts_slug_trigger
  BEFORE INSERT OR UPDATE
  ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION generate_slug_trigger();

DROP TRIGGER IF EXISTS mlm_companies_slug_trigger ON mlm_companies;
CREATE TRIGGER mlm_companies_slug_trigger
  BEFORE INSERT OR UPDATE
  ON mlm_companies
  FOR EACH ROW
  EXECUTE FUNCTION generate_slug_trigger();

DROP TRIGGER IF EXISTS classifieds_slug_trigger ON classifieds;
CREATE TRIGGER classifieds_slug_trigger
  BEFORE INSERT OR UPDATE
  ON classifieds
  FOR EACH ROW
  EXECUTE FUNCTION generate_slug_trigger();