-- Change news_category from text to uuid (category ID)
-- This migration will:
-- 1. Migrate existing category names to category IDs
-- 2. Change the column type from text to uuid
-- 3. Add foreign key constraint to news_categories table

-- Step 1: Add a temporary column to store the category ID
ALTER TABLE public.news 
ADD COLUMN IF NOT EXISTS news_category_id uuid;

-- Step 2: Migrate existing category names to IDs
-- Match category names in news table with names in news_categories table
UPDATE public.news n
SET news_category_id = nc.id
FROM public.news_categories nc
WHERE n.news_category = nc.name
  AND n.news_category IS NOT NULL;

-- Step 3: Drop the old text column
ALTER TABLE public.news 
DROP COLUMN IF EXISTS news_category;

-- Step 4: Rename the new column to news_category
ALTER TABLE public.news 
RENAME COLUMN news_category_id TO news_category;

-- Step 5: Add foreign key constraint
ALTER TABLE public.news
ADD CONSTRAINT news_news_category_fkey 
FOREIGN KEY (news_category) 
REFERENCES public.news_categories(id) 
ON DELETE SET NULL;

-- Step 6: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_news_category ON public.news(news_category);

