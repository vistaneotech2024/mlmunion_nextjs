-- Add SEO fields to news table
ALTER TABLE public.news
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS meta_keywords text,
ADD COLUMN IF NOT EXISTS focus_keyword text;



