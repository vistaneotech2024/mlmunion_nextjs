-- Create blog_categories table
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NULL,
  is_active integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT blog_categories_pkey PRIMARY KEY (id),
  CONSTRAINT blog_categories_name_key UNIQUE (name)
) TABLESPACE pg_default;

-- Insert some default categories
INSERT INTO public.blog_categories (name, description, is_active) VALUES
  ('Business Strategy', 'Business strategy and planning articles', 1),
  ('Marketing Tips', 'Marketing tips and techniques', 1),
  ('Success Stories', 'Success stories and case studies', 1),
  ('Industry News', 'Industry news and updates', 1),
  ('Training Resources', 'Training and educational resources', 1),
  ('Personal Development', 'Personal development and growth', 1)
ON CONFLICT (name) DO NOTHING;

-- Add RLS policies
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories
CREATE POLICY "Allow public read access to blog_categories"
  ON public.blog_categories
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert/update/delete (admin only in practice)
CREATE POLICY "Allow authenticated users to manage blog_categories"
  ON public.blog_categories
  FOR ALL
  USING (auth.role() = 'authenticated');

