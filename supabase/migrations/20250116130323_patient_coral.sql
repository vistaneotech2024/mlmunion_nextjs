-- Create news table
CREATE TABLE IF NOT EXISTS news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  image_url text NOT NULL,
  published boolean DEFAULT true,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  likes integer DEFAULT 0,
  dislikes integer DEFAULT 0,
  views integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Create news_reactions table for likes/dislikes
CREATE TABLE IF NOT EXISTS news_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id uuid REFERENCES news(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('like', 'dislike')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(news_id, user_id)
);

-- Enable RLS
ALTER TABLE news_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for news
CREATE POLICY "Anyone can view published news"
ON news FOR SELECT
USING (published = true);

CREATE POLICY "Authors can view their own unpublished news"
ON news FOR SELECT
USING (author_id = auth.uid());

CREATE POLICY "Authors can create news"
ON news FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own news"
ON news FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all news"
ON news FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

-- Create policies for news_reactions
CREATE POLICY "Anyone can view news reactions"
ON news_reactions FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can react to news"
ON news_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
ON news_reactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON news_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for news images
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for news images
CREATE POLICY "Public news images are viewable by everyone"
ON storage.objects FOR SELECT
USING ( bucket_id = 'news-images' );

CREATE POLICY "Authenticated users can upload news images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'news-images' );

CREATE POLICY "Authors can update their news images"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'news-images' );

CREATE POLICY "Authors can delete their news images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'news-images' );

-- Create function to increment news views
CREATE OR REPLACE FUNCTION increment_news_views(article_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE news
  SET views = views + 1
  WHERE id = article_id;
END;
$$;

-- Create function to handle news reactions
CREATE OR REPLACE FUNCTION handle_news_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this is a new reaction
  IF TG_OP = 'INSERT' THEN
    -- Increment the appropriate counter
    UPDATE news
    SET 
      likes = CASE WHEN NEW.reaction = 'like' THEN likes + 1 ELSE likes END,
      dislikes = CASE WHEN NEW.reaction = 'dislike' THEN dislikes + 1 ELSE dislikes END
    WHERE id = NEW.news_id;
  
  -- If this is a reaction update
  ELSIF TG_OP = 'UPDATE' AND OLD.reaction != NEW.reaction THEN
    -- Decrement old reaction counter and increment new one
    UPDATE news
    SET 
      likes = CASE 
        WHEN OLD.reaction = 'like' THEN likes - 1
        WHEN NEW.reaction = 'like' THEN likes + 1
        ELSE likes
      END,
      dislikes = CASE 
        WHEN OLD.reaction = 'dislike' THEN dislikes - 1
        WHEN NEW.reaction = 'dislike' THEN dislikes + 1
        ELSE dislikes
      END
    WHERE id = NEW.news_id;
  
  -- If this is a reaction deletion
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement the appropriate counter
    UPDATE news
    SET 
      likes = CASE WHEN OLD.reaction = 'like' THEN likes - 1 ELSE likes END,
      dislikes = CASE WHEN OLD.reaction = 'dislike' THEN dislikes - 1 ELSE dislikes END
    WHERE id = OLD.news_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for news reactions
CREATE TRIGGER on_news_reaction_change
  AFTER INSERT OR UPDATE OR DELETE ON news_reactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_news_reaction();