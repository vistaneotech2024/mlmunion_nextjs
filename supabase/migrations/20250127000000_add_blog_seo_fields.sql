-- Add SEO fields to blog_posts table
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS meta_keywords text,
ADD COLUMN IF NOT EXISTS focus_keyword text;

