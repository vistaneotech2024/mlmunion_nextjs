-- Add SEO fields to classifieds table
ALTER TABLE public.classifieds
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS meta_keywords text,
ADD COLUMN IF NOT EXISTS focus_keyword text;

