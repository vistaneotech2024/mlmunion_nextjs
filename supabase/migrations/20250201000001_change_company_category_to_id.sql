-- Change mlm_companies.category from text to uuid (category ID)
-- This migration will:
-- 1. Add a new category_id column
-- 2. Migrate existing category names to category IDs
-- 3. Drop the old category column
-- 4. Rename category_id to category

-- Step 1: Add new category_id column
ALTER TABLE public.mlm_companies
ADD COLUMN IF NOT EXISTS category_id uuid;

-- Step 2: Migrate existing category text values to category IDs
UPDATE public.mlm_companies mc
SET category_id = cc.id
FROM public.company_categories cc
WHERE LOWER(TRIM(mc.category)) = LOWER(TRIM(cc.name))
  AND mc.category_id IS NULL;

-- Step 3: For any companies that don't have a matching category, assign "Other"
UPDATE public.mlm_companies
SET category_id = (
  SELECT id FROM public.company_categories WHERE name = 'Other' LIMIT 1
)
WHERE category_id IS NULL;

-- Step 4: Make category_id NOT NULL (after migration)
ALTER TABLE public.mlm_companies
ALTER COLUMN category_id SET NOT NULL;

-- Step 5: Add foreign key constraint
ALTER TABLE public.mlm_companies
ADD CONSTRAINT mlm_companies_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES public.company_categories(id) 
ON DELETE SET NULL;

-- Step 6: Drop the old category column
ALTER TABLE public.mlm_companies
DROP COLUMN IF EXISTS category;

-- Step 7: Rename category_id to category
ALTER TABLE public.mlm_companies
RENAME COLUMN category_id TO category;

-- Step 8: Update index
DROP INDEX IF EXISTS idx_mlm_companies_category;
CREATE INDEX IF NOT EXISTS idx_mlm_companies_category ON public.mlm_companies(category);

