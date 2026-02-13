-- Create company_categories table
CREATE TABLE IF NOT EXISTS public.company_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NULL,
  is_active integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT company_categories_pkey PRIMARY KEY (id),
  CONSTRAINT company_categories_name_key UNIQUE (name)
) TABLESPACE pg_default;

-- Insert some default categories
INSERT INTO public.company_categories (name, description, is_active) VALUES
  ('Health & Wellness', 'Health and wellness MLM companies', 1),
  ('Beauty', 'Beauty and cosmetics MLM companies', 1),
  ('Personal Care', 'Personal care products MLM companies', 1),
  ('Home Care', 'Home care products MLM companies', 1),
  ('Nutrition', 'Nutrition and supplements MLM companies', 1),
  ('Fashion', 'Fashion and accessories MLM companies', 1),
  ('Technology', 'Technology and software MLM companies', 1),
  ('Financial Services', 'Financial services MLM companies', 1),
  ('Education', 'Education and training MLM companies', 1),
  ('Other', 'Other MLM companies', 1)
ON CONFLICT (name) DO NOTHING;

-- Add RLS policies
ALTER TABLE public.company_categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories
CREATE POLICY "Allow public read access to company_categories"
  ON public.company_categories
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert/update/delete (admin only in practice)
CREATE POLICY "Allow authenticated users to manage company_categories"
  ON public.company_categories
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_company_categories_is_active ON public.company_categories(is_active);

