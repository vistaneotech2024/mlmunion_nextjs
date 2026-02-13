/*
  # Points Management System

  1. New Tables
    - `point_activities` - Defines activities that earn points
    - `badges` - Defines badges that users can earn
    - `ranks` - Defines user ranks based on points

  2. Changes
    - Add functions to award badges and ranks
    - Add triggers to update user badges and ranks
*/

-- Create point_activities table
CREATE TABLE IF NOT EXISTS point_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL UNIQUE,
  points integer NOT NULL DEFAULT 0,
  description text NOT NULL
);

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  min_points integer NOT NULL,
  description text,
  "order" integer NOT NULL DEFAULT 0
);

-- Create ranks table
CREATE TABLE IF NOT EXISTS ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  min_points integer NOT NULL,
  benefits text[] NOT NULL DEFAULT '{}',
  description text,
  "order" integer NOT NULL DEFAULT 0
);

-- Create user_badges table to track which badges users have earned
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id uuid REFERENCES badges(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Create user_ranks table to track user ranks
CREATE TABLE IF NOT EXISTS user_ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rank_id uuid REFERENCES ranks(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create points_history table to track point transactions
CREATE TABLE IF NOT EXISTS points_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES point_activities(id) ON DELETE SET NULL,
  points integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE point_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Point activities
CREATE POLICY "Anyone can view point activities"
  ON point_activities FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage point activities"
  ON point_activities FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Badges
CREATE POLICY "Anyone can view badges"
  ON badges FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage badges"
  ON badges FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Ranks
CREATE POLICY "Anyone can view ranks"
  ON ranks FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage ranks"
  ON ranks FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- User badges
CREATE POLICY "Users can view their own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view other users' badges"
  ON user_badges FOR SELECT
  USING (true);

CREATE POLICY "Only system can manage user badges"
  ON user_badges FOR ALL
  USING (false);

-- User ranks
CREATE POLICY "Users can view their own rank"
  ON user_ranks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view other users' ranks"
  ON user_ranks FOR SELECT
  USING (true);

CREATE POLICY "Only system can manage user ranks"
  ON user_ranks FOR ALL
  USING (false);

-- Points history
CREATE POLICY "Users can view their own points history"
  ON points_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all points history"
  ON points_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Create function to update user badges based on points
CREATE OR REPLACE FUNCTION update_user_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  badge record;
BEGIN
  -- Check each badge to see if the user qualifies
  FOR badge IN 
    SELECT * FROM badges 
    WHERE min_points <= NEW.points
    ORDER BY min_points
  LOOP
    -- Insert badge if user doesn't already have it
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (NEW.id, badge.id)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create function to update user rank based on points
CREATE OR REPLACE FUNCTION update_user_rank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  highest_rank uuid;
BEGIN
  -- Find the highest rank the user qualifies for
  SELECT id INTO highest_rank
  FROM ranks
  WHERE min_points <= NEW.points
  ORDER BY min_points DESC
  LIMIT 1;
  
  IF highest_rank IS NOT NULL THEN
    -- Insert or update user rank
    INSERT INTO user_ranks (user_id, rank_id)
    VALUES (NEW.id, highest_rank)
    ON CONFLICT (user_id) 
    DO UPDATE SET rank_id = highest_rank, earned_at = now()
    WHERE user_ranks.rank_id <> highest_rank;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update badges and rank when points change
CREATE TRIGGER update_user_badges_trigger
  AFTER INSERT OR UPDATE OF points ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_badges();

CREATE TRIGGER update_user_rank_trigger
  AFTER INSERT OR UPDATE OF points ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rank();

-- Update award_points function to log history
CREATE OR REPLACE FUNCTION award_points(
  user_id UUID,
  points_to_award INTEGER,
  action TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_id uuid;
  activity_description text;
BEGIN
  -- Get activity ID and description
  SELECT id, description INTO activity_id, activity_description
  FROM point_activities
  WHERE action = award_points.action;
  
  -- Log points history
  INSERT INTO points_history (user_id, activity_id, points, description)
  VALUES (
    user_id, 
    activity_id, 
    points_to_award, 
    COALESCE(activity_description, 'Points awarded for ' || action)
  );
  
  -- Update user points
  UPDATE profiles 
  SET points = COALESCE(points, 0) + points_to_award
  WHERE id = user_id;
END;
$$;

-- Insert default point activities
INSERT INTO point_activities (action, points, description) VALUES
('blog_post', 10, 'Create a blog post'),
('blog_comment', 2, 'Comment on a blog post'),
('classified_post', 5, 'Post a classified ad'),
('company_submit', 10, 'Submit a new MLM company'),
('company_review', 3, 'Review a company'),
('profile_complete', 20, 'Complete your profile'),
('daily_login', 1, 'Log in daily'),
('share_content', 5, 'Share content on social media'),
('refer_user', 25, 'Refer a new user'),
('profile_view', 1, 'Someone viewed your profile')
ON CONFLICT (action) DO UPDATE
SET points = EXCLUDED.points,
    description = EXCLUDED.description;

-- Insert default badges
INSERT INTO badges (name, icon, color, min_points, description, "order") VALUES
('Newcomer', '🌱', 'gray', 0, 'Welcome to the community', 0),
('Regular', '⭐', 'blue', 50, 'Active community member', 1),
('Expert', '🏆', 'green', 100, 'Experienced contributor', 2),
('Master', '👑', 'purple', 200, 'Master networker', 3),
('Legend', '🌟', 'yellow', 500, 'Legendary status', 4)
ON CONFLICT DO NOTHING;

-- Insert default ranks
INSERT INTO ranks (name, icon, color, min_points, benefits, description, "order") VALUES
('Bronze', '🥉', 'gray', 0, ARRAY['Basic profile', 'Community access'], 'Starting rank for all users', 0),
('Silver', '🥈', 'blue', 100, ARRAY['Enhanced profile', 'Priority support', 'Featured listings'], 'Intermediate rank with additional benefits', 1),
('Gold', '🥇', 'yellow', 500, ARRAY['Premium profile', 'Direct messaging', 'Verified badge', 'Featured on homepage'], 'Advanced rank with premium benefits', 2),
('Platinum', '💎', 'purple', 1000, ARRAY['All Gold benefits', 'Ad-free experience', 'Early access to new features', 'Special badge'], 'Elite rank with exclusive benefits', 3)
ON CONFLICT DO NOTHING;

-- Create function to get user badge
CREATE OR REPLACE FUNCTION get_user_badge(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_points integer;
  badge_info json;
BEGIN
  -- Get user points
  SELECT points INTO user_points
  FROM profiles
  WHERE id = user_id;
  
  -- Get highest badge user qualifies for
  SELECT json_build_object(
    'id', b.id,
    'name', b.name,
    'icon', b.icon,
    'color', b.color,
    'min_points', b.min_points,
    'description', b.description
  ) INTO badge_info
  FROM badges b
  WHERE b.min_points <= user_points
  ORDER BY b.min_points DESC
  LIMIT 1;
  
  RETURN badge_info;
END;
$$;

-- Create function to get user rank
CREATE OR REPLACE FUNCTION get_user_rank(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_points integer;
  rank_info json;
BEGIN
  -- Get user points
  SELECT points INTO user_points
  FROM profiles
  WHERE id = user_id;
  
  -- Get highest rank user qualifies for
  SELECT json_build_object(
    'id', r.id,
    'name', r.name,
    'icon', r.icon,
    'color', r.color,
    'min_points', r.min_points,
    'benefits', r.benefits,
    'description', r.description
  ) INTO rank_info
  FROM ranks r
  WHERE r.min_points <= user_points
  ORDER BY r.min_points DESC
  LIMIT 1;
  
  RETURN rank_info;
END;
$$;

-- Create function to get user points history
CREATE OR REPLACE FUNCTION get_user_points_history(user_id uuid)
RETURNS TABLE (
  id uuid,
  activity text,
  points integer,
  description text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ph.id,
    pa.action as activity,
    ph.points,
    ph.description,
    ph.created_at
  FROM points_history ph
  LEFT JOIN point_activities pa ON ph.activity_id = pa.id
  WHERE ph.user_id = get_user_points_history.user_id
  ORDER BY ph.created_at DESC;
END;
$$;