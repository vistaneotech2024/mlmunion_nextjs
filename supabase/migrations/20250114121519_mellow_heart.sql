/*
  # Fix Schema Issues

  1. Changes
    - Add cover_image column to blog_posts
    - Add state and city columns to mlm_companies
    - Fix award_points function parameters

  2. Security
    - Maintain existing RLS policies
*/

-- Add cover_image to blog_posts
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS cover_image text;

-- Add state and city to mlm_companies
ALTER TABLE mlm_companies
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS city text;

-- Drop and recreate award_points function with correct parameters
DROP FUNCTION IF EXISTS public.award_points(uuid, integer, text);

CREATE OR REPLACE FUNCTION public.award_points(
  user_id UUID,
  points_to_award INTEGER,
  action TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles 
  SET points = COALESCE(points, 0) + points_to_award
  WHERE id = user_id;
END;
$$;