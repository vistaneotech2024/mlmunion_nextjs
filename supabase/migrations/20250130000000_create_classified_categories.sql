-- Create classified_categories table
CREATE TABLE IF NOT EXISTS public.classified_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NULL,
  is_active integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT classified_categories_pkey PRIMARY KEY (id),
  CONSTRAINT classified_categories_name_key UNIQUE (name)
) TABLESPACE pg_default;

-- Insert default categories
INSERT INTO public.classified_categories (name, description, is_active) VALUES
  ('Health & Wellness', 'Health and wellness related opportunities', 1),
  ('Beauty', 'Beauty and cosmetics related opportunities', 1),
  ('Finance', 'Financial and investment opportunities', 1),
  ('Other', 'Other business opportunities', 1)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.classified_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to classified_categories"
  ON public.classified_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to manage classified_categories"
  ON public.classified_categories
  FOR ALL
  USING (auth.role() = 'authenticated');

