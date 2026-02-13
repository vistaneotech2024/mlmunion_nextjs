-- Make image_url nullable in news table
ALTER TABLE public.news 
ALTER COLUMN image_url DROP NOT NULL;


