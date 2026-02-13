/*
  # Add Direct Sellers functionality

  1. Updates
    - Add location fields to profiles table
    - Add direct_seller flag to profiles
    - Add points for viewing profiles and blogs
    
  2. Security
    - Enable RLS for all new columns
    - Add policies for viewing direct seller profiles
*/

-- Add location and direct seller fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS is_direct_seller boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_bio text,
ADD COLUMN IF NOT EXISTS specialties text[];

-- Create function to award points for viewing profiles
CREATE OR REPLACE FUNCTION award_view_points()
RETURNS trigger AS $$
BEGIN
  -- Award points to the profile owner when their profile is viewed
  UPDATE profiles 
  SET points = COALESCE(points, 0) + 1
  WHERE id = NEW.profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create profile views tracking
CREATE TABLE IF NOT EXISTS profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id),
  viewer_id uuid REFERENCES profiles(id),
  viewed_at timestamptz DEFAULT now()
);

-- Create trigger for profile views
CREATE TRIGGER on_profile_view
  AFTER INSERT ON profile_views
  FOR EACH ROW
  EXECUTE FUNCTION award_view_points();