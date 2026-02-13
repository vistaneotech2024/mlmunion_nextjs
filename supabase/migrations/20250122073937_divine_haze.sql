-- Add slug fields to relevant tables
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS slug text UNIQUE;

ALTER TABLE mlm_companies 
ADD COLUMN IF NOT EXISTS slug text UNIQUE;

ALTER TABLE classifieds
ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Create function to generate slugs
CREATE OR REPLACE FUNCTION generate_unique_slug(title text, table_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  new_slug text;
  counter integer := 1;
BEGIN
  -- Convert to lowercase and replace spaces/special chars with hyphens
  base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  
  -- Initial slug
  new_slug := base_slug;
  
  -- Check if slug exists and append counter if needed
  WHILE EXISTS(
    SELECT 1 FROM (
      SELECT slug FROM blog_posts WHERE slug = new_slug
      UNION ALL
      SELECT slug FROM mlm_companies WHERE slug = new_slug
      UNION ALL
      SELECT slug FROM classifieds WHERE slug = new_slug
    ) existing_slugs
  ) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN new_slug;
END;
$$;

-- Create triggers to automatically generate slugs
CREATE OR REPLACE FUNCTION generate_slug_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
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

-- Add triggers to tables
DROP TRIGGER IF EXISTS blog_posts_slug_trigger ON blog_posts;
CREATE TRIGGER blog_posts_slug_trigger
  BEFORE INSERT OR UPDATE OF title ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION generate_slug_trigger();

DROP TRIGGER IF EXISTS mlm_companies_slug_trigger ON mlm_companies;
CREATE TRIGGER mlm_companies_slug_trigger
  BEFORE INSERT OR UPDATE OF name ON mlm_companies
  FOR EACH ROW
  EXECUTE FUNCTION generate_slug_trigger();

DROP TRIGGER IF EXISTS classifieds_slug_trigger ON classifieds;
CREATE TRIGGER classifieds_slug_trigger
  BEFORE INSERT OR UPDATE OF title ON classifieds
  FOR EACH ROW
  EXECUTE FUNCTION generate_slug_trigger();

-- Backfill existing records with slugs
UPDATE blog_posts 
SET slug = generate_unique_slug(title, 'blog_posts')
WHERE slug IS NULL;

UPDATE mlm_companies 
SET slug = generate_unique_slug(name, 'mlm_companies')
WHERE slug IS NULL;

UPDATE classifieds 
SET slug = generate_unique_slug(title, 'classifieds')
WHERE slug IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_mlm_companies_slug ON mlm_companies(slug);
CREATE INDEX IF NOT EXISTS idx_classifieds_slug ON classifieds(slug);