/*
  # Add Report Fields

  1. New Fields
    - Add is_active to countries, states, cities tables
    - Add view_count to blog_posts table
    - Add status to classifieds table
    - Add view_count to classifieds table

  2. Security
    - Enable RLS on all new fields
    - Add policies for admin access
*/

-- Add active status to location tables
ALTER TABLE countries 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE states
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE cities
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add view count to blog posts
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Add status and view count to classifieds
ALTER TABLE classifieds
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Create function to increment view count for blog posts
CREATE OR REPLACE FUNCTION increment_blog_views(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE blog_posts
  SET view_count = view_count + 1
  WHERE id = post_id;
END;
$$;

-- Create function to increment view count for classifieds
CREATE OR REPLACE FUNCTION increment_classified_views(classified_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE classifieds
  SET view_count = view_count + 1
  WHERE id = classified_id;
END;
$$;

-- Add RLS policies for new fields
CREATE POLICY "Anyone can view location status"
ON countries FOR SELECT
USING (true);

CREATE POLICY "Anyone can view location status"
ON states FOR SELECT
USING (true);

CREATE POLICY "Anyone can view location status"
ON cities FOR SELECT
USING (true);

-- Only admins can update location status
CREATE POLICY "Only admins can update location status"
ON countries FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Only admins can update location status"
ON states FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Only admins can update location status"
ON cities FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));