/*
  # Page Management System

  1. Updates
    - Enhance page_content table with additional fields for navigation and SEO
    - Add fields for menu management
    - Add fields for footer organization
    - Add fields for page hierarchy
    
  2. Security
    - Maintain existing RLS policies
*/

-- Enhance page_content table with additional fields
ALTER TABLE page_content
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_main_nav boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_footer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS footer_column integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS nav_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_page text,
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS meta_keywords text;

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_page_content_slug ON page_content(slug);

-- Create index on parent_page for faster hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_page_content_parent ON page_content(parent_page);

-- Create index on nav_order for faster sorting
CREATE INDEX IF NOT EXISTS idx_page_content_nav_order ON page_content(nav_order);

-- Update existing pages with titles
UPDATE page_content
SET 
  title = CASE 
    WHEN page = 'about' THEN 'About Us'
    WHEN page = 'privacy' THEN 'Privacy Policy'
    WHEN page = 'terms' THEN 'Terms of Service'
    ELSE INITCAP(REPLACE(page, '_', ' '))
  END,
  slug = page,
  is_published = true
WHERE title IS NULL;

-- Add some default pages to footer
UPDATE page_content
SET 
  is_footer = true,
  footer_column = CASE 
    WHEN page = 'about' THEN 1
    WHEN page = 'privacy' THEN 2
    WHEN page = 'terms' THEN 2
    ELSE footer_column
  END
WHERE page IN ('about', 'privacy', 'terms');

-- Create function to get page by slug
CREATE OR REPLACE FUNCTION get_page_by_slug(page_slug text)
RETURNS TABLE (
  id uuid,
  page text,
  title text,
  content text,
  slug text,
  is_published boolean,
  meta_description text,
  meta_keywords text,
  last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.page,
    p.title,
    p.content,
    p.slug,
    p.is_published,
    p.meta_description,
    p.meta_keywords,
    p.last_updated
  FROM page_content p
  WHERE (p.slug = page_slug OR p.page = page_slug)
    AND p.is_published = true;
END;
$$;

-- Create function to get navigation menu
CREATE OR REPLACE FUNCTION get_navigation_menu()
RETURNS TABLE (
  id uuid,
  page text,
  title text,
  slug text,
  parent_page text,
  nav_order integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.page,
    p.title,
    p.slug,
    p.parent_page,
    p.nav_order
  FROM page_content p
  WHERE p.is_main_nav = true
    AND p.is_published = true
  ORDER BY p.nav_order;
END;
$$;

-- Create function to get footer menu
CREATE OR REPLACE FUNCTION get_footer_menu()
RETURNS TABLE (
  id uuid,
  page text,
  title text,
  slug text,
  footer_column integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.page,
    p.title,
    p.slug,
    p.footer_column
  FROM page_content p
  WHERE p.is_footer = true
    AND p.is_published = true
  ORDER BY p.footer_column, p.nav_order;
END;
$$;