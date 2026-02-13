/*
  # Create classified-images storage bucket and policies
  
  1. Creates storage bucket for classified images
  2. Sets up RLS policies:
    - Public read access
    - Authenticated user write access
    - Owner-only delete access
*/

-- Add classified-images bucket to storage schema
INSERT INTO storage.buckets (id, name, public)
VALUES ('classified-images', 'classified-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Classified images are viewable by everyone" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload classified images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own classified images" ON storage.objects;
END $$;

-- Create policies for classified-images bucket
CREATE POLICY "Classified images are viewable by everyone"
ON storage.objects FOR SELECT
USING ( bucket_id = 'classified-images' );

CREATE POLICY "Authenticated users can upload classified images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'classified-images' );

CREATE POLICY "Users can delete their own classified images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'classified-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);




































