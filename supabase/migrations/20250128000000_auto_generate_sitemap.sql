-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to trigger sitemap generation
CREATE OR REPLACE FUNCTION trigger_sitemap_generation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  function_url text;
  response_status int;
BEGIN
  -- Get the Supabase function URL from environment or use default
  -- This should be set in your Supabase project settings
  function_url := current_setting('app.sitemap_function_url', true);
  
  -- If not set, construct from Supabase URL
  IF function_url IS NULL OR function_url = '' THEN
    function_url := current_setting('app.supabase_url', true) || '/functions/v1/generate-sitemap';
  END IF;
  
  -- Only proceed if we have a URL
  IF function_url IS NOT NULL AND function_url != '' THEN
    -- Call the Edge Function asynchronously (fire and forget)
    -- This prevents blocking the main transaction
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := jsonb_build_object('triggered_by', TG_TABLE_NAME, 'action', TG_OP)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for blog_posts
DROP TRIGGER IF EXISTS blog_posts_sitemap_trigger ON blog_posts;
CREATE TRIGGER blog_posts_sitemap_trigger
  AFTER INSERT OR UPDATE OF published, slug ON blog_posts
  FOR EACH ROW
  WHEN (NEW.published = true AND NEW.slug IS NOT NULL)
  EXECUTE FUNCTION trigger_sitemap_generation();

-- Create triggers for news
DROP TRIGGER IF EXISTS news_sitemap_trigger ON news;
CREATE TRIGGER news_sitemap_trigger
  AFTER INSERT OR UPDATE OF published, slug ON news
  FOR EACH ROW
  WHEN (NEW.published = true AND NEW.slug IS NOT NULL)
  EXECUTE FUNCTION trigger_sitemap_generation();

-- Create triggers for classifieds
DROP TRIGGER IF EXISTS classifieds_sitemap_trigger ON classifieds;
CREATE TRIGGER classifieds_sitemap_trigger
  AFTER INSERT OR UPDATE OF status, slug ON classifieds
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND NEW.slug IS NOT NULL)
  EXECUTE FUNCTION trigger_sitemap_generation();

-- Create triggers for mlm_companies
DROP TRIGGER IF EXISTS mlm_companies_sitemap_trigger ON mlm_companies;
CREATE TRIGGER mlm_companies_sitemap_trigger
  AFTER INSERT OR UPDATE OF slug ON mlm_companies
  FOR EACH ROW
  WHEN (NEW.slug IS NOT NULL)
  EXECUTE FUNCTION trigger_sitemap_generation();

-- Alternative simpler approach: Create a function that can be called manually
-- This doesn't require pg_net and can be called from application code
CREATE OR REPLACE FUNCTION notify_sitemap_update()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function can be called from application code after content updates
  -- It doesn't do anything in the database, but can be extended
  -- to update a flag or timestamp that triggers sitemap regeneration
  PERFORM 1;
END;
$$;


