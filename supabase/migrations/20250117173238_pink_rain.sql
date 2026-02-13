-- Create blog_reactions table
CREATE TABLE IF NOT EXISTS blog_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('like', 'dislike')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(blog_id, user_id)
);

-- Enable RLS
ALTER TABLE blog_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for blog_reactions
CREATE POLICY "Anyone can view blog reactions"
ON blog_reactions FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can react to blogs"
ON blog_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
ON blog_reactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON blog_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Add likes and dislikes columns to blog_posts if they don't exist
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS dislikes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Create function to handle blog reactions
CREATE OR REPLACE FUNCTION handle_blog_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this is a new reaction
  IF TG_OP = 'INSERT' THEN
    -- Increment the appropriate counter
    UPDATE blog_posts
    SET 
      likes = CASE WHEN NEW.reaction = 'like' THEN likes + 1 ELSE likes END,
      dislikes = CASE WHEN NEW.reaction = 'dislike' THEN dislikes + 1 ELSE dislikes END
    WHERE id = NEW.blog_id;
  
  -- If this is a reaction update
  ELSIF TG_OP = 'UPDATE' AND OLD.reaction != NEW.reaction THEN
    -- Decrement old reaction counter and increment new one
    UPDATE blog_posts
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
    WHERE id = NEW.blog_id;
  
  -- If this is a reaction deletion
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement the appropriate counter
    UPDATE blog_posts
    SET 
      likes = CASE WHEN OLD.reaction = 'like' THEN likes - 1 ELSE likes END,
      dislikes = CASE WHEN OLD.reaction = 'dislike' THEN dislikes - 1 ELSE dislikes END
    WHERE id = OLD.blog_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for blog reactions
CREATE TRIGGER on_blog_reaction_change
  AFTER INSERT OR UPDATE OR DELETE ON blog_reactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_blog_reaction();

-- Create function to increment blog views
CREATE OR REPLACE FUNCTION increment_blog_views(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE blog_posts
  SET view_count = view_count + 1
  WHERE id = post_id;
END;
$$;