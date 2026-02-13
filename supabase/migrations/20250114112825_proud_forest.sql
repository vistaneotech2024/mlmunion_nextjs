/*
  # Create storage buckets and policies
  
  1. Creates required storage buckets for:
    - User avatars
    - Blog images
    - Company logos
  
  2. Sets up RLS policies for each bucket:
    - Public read access
    - Authenticated user write access
    - Owner-only delete access
*/

-- Add buckets to storage schema
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('blog-images', 'blog-images', true),
  ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public avatars are viewable by everyone v2" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their own avatar v2" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatar v2" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatar v2" ON storage.objects;
  DROP POLICY IF EXISTS "Blog images are viewable by everyone v2" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload blog images v2" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own blog images v2" ON storage.objects;
  DROP POLICY IF EXISTS "Company logos are viewable by everyone v2" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload company logos v2" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own company logos v2" ON storage.objects;
END $$;

-- Create policies for avatars bucket
CREATE POLICY "Public avatars are viewable by everyone v2"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload their own avatar v2"
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar v2"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar v2"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policies for blog-images bucket
CREATE POLICY "Blog images are viewable by everyone v2"
ON storage.objects FOR SELECT
USING ( bucket_id = 'blog-images' );

CREATE POLICY "Authenticated users can upload blog images v2"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'blog-images' );

CREATE POLICY "Users can delete their own blog images v2"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'blog-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policies for company-logos bucket
CREATE POLICY "Company logos are viewable by everyone v2"
ON storage.objects FOR SELECT
USING ( bucket_id = 'company-logos' );

CREATE POLICY "Authenticated users can upload company logos v2"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'company-logos' );

CREATE POLICY "Users can delete their own company logos v2"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);