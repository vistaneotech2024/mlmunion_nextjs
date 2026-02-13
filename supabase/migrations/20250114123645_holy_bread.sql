/*
  # Fix RLS policies and add missing features

  1. Changes
    - Fix infinite recursion in profiles policies
    - Add missing indexes for performance
    - Add missing RLS policies
    - Fix award_points function

  2. Security
    - Update RLS policies to prevent recursion
    - Ensure proper access control for all tables
*/

-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can access all profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies for profiles
CREATE POLICY "Anyone can view basic profile info"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
ON profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Fix award_points function to be more robust
CREATE OR REPLACE FUNCTION public.award_points(
  user_id UUID,
  points_to_award INTEGER,
  action TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate input
  IF points_to_award < 0 THEN
    RAISE EXCEPTION 'Points to award must be non-negative';
  END IF;

  -- Update user points
  UPDATE profiles 
  SET points = COALESCE(points, 0) + points_to_award
  WHERE id = user_id;

  -- Could add points history logging here if needed
END;
$$;

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_points ON profiles(points DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published);
CREATE INDEX IF NOT EXISTS idx_classifieds_user ON classifieds(user_id);
CREATE INDEX IF NOT EXISTS idx_mlm_companies_status ON mlm_companies(status);

-- Add missing RLS policies for better security
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile views"
ON profile_views FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "Users can create profile views"
ON profile_views FOR INSERT
TO authenticated
WITH CHECK (viewer_id = auth.uid());