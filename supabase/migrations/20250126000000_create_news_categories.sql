-- Create news_categories table
CREATE TABLE IF NOT EXISTS public.news_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NULL,
  is_active integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT news_categories_pkey PRIMARY KEY (id),
  CONSTRAINT news_categories_name_key UNIQUE (name)
) TABLESPACE pg_default;

-- Insert some default categories
INSERT INTO public.news_categories (name, description, is_active) VALUES
  ('Business', 'Business and industry news', 1),
  ('Technology', 'Technology and innovation news', 1),
  ('Finance', 'Financial news and updates', 1),
  ('Health', 'Health and wellness news', 1),
  ('Education', 'Education and learning news', 1),
  ('Politics', 'Political news and updates', 1),
  ('Sports', 'Sports news and updates', 1),
  ('Entertainment', 'Entertainment and culture news', 1),
  ('Science', 'Science and research news', 1),
  ('General', 'General news and updates', 1)
ON CONFLICT (name) DO NOTHING;

-- Add RLS policies
ALTER TABLE public.news_categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories
CREATE POLICY "Allow public read access to news_categories"
  ON public.news_categories
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert/update/delete (admin only in practice)
CREATE POLICY "Allow authenticated users to manage news_categories"
  ON public.news_categories
  FOR ALL
  USING (auth.role() = 'authenticated');

