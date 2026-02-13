-- Drop existing trigger function
DROP FUNCTION IF EXISTS generate_slug_trigger CASCADE;

-- Create updated trigger function with better field handling
CREATE OR REPLACE FUNCTION generate_slug_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_text text;
BEGIN
  -- Only generate slug if it's NULL
  IF NEW.slug IS NULL THEN
    -- Get the text to base the slug on based on table
    source_text := CASE TG_TABLE_NAME
      WHEN 'blog_posts' THEN NEW.title
      WHEN 'mlm_companies' THEN NEW.name
      WHEN 'classifieds' THEN NEW.title
      ELSE NULL
    END;

    -- Only proceed if we have source text
    IF source_text IS NOT NULL THEN
      NEW.slug := generate_unique_slug(source_text, TG_TABLE_NAME);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate triggers
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

-- Ensure all existing records have slugs
UPDATE blog_posts 
SET slug = generate_unique_slug(title, 'blog_posts')
WHERE slug IS NULL;

UPDATE mlm_companies 
SET slug = generate_unique_slug(name, 'mlm_companies')
WHERE slug IS NULL;

UPDATE classifieds 
SET slug = generate_unique_slug(title, 'classifieds')
WHERE slug IS NULL;