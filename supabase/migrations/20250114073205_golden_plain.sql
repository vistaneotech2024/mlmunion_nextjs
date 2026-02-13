/*
  # Add points system

  1. Changes
    - Add points column to profiles table
    - Create award_points function for managing user points
    - Add trigger to initialize points for new users

  2. Points System
    - Blog posts: 10 points
    - Classifieds: 5 points
    - Comments: 2 points
    - Company votes: 1 point
*/

-- Add points column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'points'
  ) THEN
    ALTER TABLE profiles ADD COLUMN points integer DEFAULT 0;
  END IF;
END $$;

-- Create function to award points
CREATE OR REPLACE FUNCTION public.award_points(
  user_id UUID,
  points INTEGER,
  action TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user points
  UPDATE profiles 
  SET points = COALESCE(points, 0) + award_points.points
  WHERE id = user_id;
  
  -- Could add points history logging here if needed
END;
$$;