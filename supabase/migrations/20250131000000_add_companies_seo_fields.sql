-- Add SEO fields to mlm_companies table
ALTER TABLE public.mlm_companies
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS meta_keywords text,
ADD COLUMN IF NOT EXISTS focus_keyword text;

