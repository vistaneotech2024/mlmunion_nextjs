-- Create hero_banners table
CREATE TABLE IF NOT EXISTS hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL,
  cta_text text NOT NULL,
  cta_link text NOT NULL,
  active boolean DEFAULT true,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE hero_banners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view hero banners"
ON hero_banners FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage hero banners"
ON hero_banners FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

-- Create storage bucket for hero banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-banners', 'hero-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for hero banners
CREATE POLICY "Public hero banner images are viewable by everyone"
ON storage.objects FOR SELECT
USING ( bucket_id = 'hero-banners' );

CREATE POLICY "Only admins can upload hero banner images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'hero-banners' AND
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ))
);

CREATE POLICY "Only admins can update hero banner images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'hero-banners' AND
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ))
);

CREATE POLICY "Only admins can delete hero banner images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'hero-banners' AND
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ))
);

-- Add some initial hero banners
INSERT INTO hero_banners (title, description, image_url, cta_text, cta_link, "order")
VALUES 
  (
    'Build Your Network Marketing Empire',
    'Connect with like-minded entrepreneurs and grow your business',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1920',
    'Get Started',
    '/register',
    0
  ),
  (
    'Share Your Success Story',
    'Write blogs and inspire others in their journey',
    'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=1920',
    'Start Writing',
    '/blog/new',
    1
  ),
  (
    'Discover Opportunities',
    'Browse classified ads for network marketing opportunities',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=1920',
    'Explore Now',
    '/classifieds',
    2
  )
ON CONFLICT DO NOTHING;