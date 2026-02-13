-- Create classified_reactions table
CREATE TABLE IF NOT EXISTS classified_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classified_id uuid REFERENCES classifieds(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('like', 'dislike')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(classified_id, user_id)
);

-- Enable RLS
ALTER TABLE classified_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for classified_reactions
CREATE POLICY "Anyone can view classified reactions"
ON classified_reactions FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can react to classifieds"
ON classified_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
ON classified_reactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON classified_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Add likes, dislikes and view_count columns to classifieds if they don't exist
ALTER TABLE classifieds
ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS dislikes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Create function to handle classified reactions
CREATE OR REPLACE FUNCTION handle_classified_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this is a new reaction
  IF TG_OP = 'INSERT' THEN
    -- Increment the appropriate counter
    UPDATE classifieds
    SET 
      likes = CASE WHEN NEW.reaction = 'like' THEN likes + 1 ELSE likes END,
      dislikes = CASE WHEN NEW.reaction = 'dislike' THEN dislikes + 1 ELSE dislikes END
    WHERE id = NEW.classified_id;
  
  -- If this is a reaction update
  ELSIF TG_OP = 'UPDATE' AND OLD.reaction != NEW.reaction THEN
    -- Decrement old reaction counter and increment new one
    UPDATE classifieds
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
    WHERE id = NEW.classified_id;
  
  -- If this is a reaction deletion
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement the appropriate counter
    UPDATE classifieds
    SET 
      likes = CASE WHEN OLD.reaction = 'like' THEN likes - 1 ELSE likes END,
      dislikes = CASE WHEN OLD.reaction = 'dislike' THEN dislikes - 1 ELSE dislikes END
    WHERE id = OLD.classified_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for classified reactions
CREATE TRIGGER on_classified_reaction_change
  AFTER INSERT OR UPDATE OR DELETE ON classified_reactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_classified_reaction();

-- Create function to increment classified views
CREATE OR REPLACE FUNCTION increment_classified_views(classified_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE classifieds
  SET view_count = view_count + 1
  WHERE id = classified_id;
END;
$$;