/*
  # Fix ambiguous column reference in award_points function

  1. Changes
    - Fix ambiguous "action" column reference in WHERE clause
    - Explicitly qualify column names to avoid ambiguity
*/

-- Fix award_points function to resolve ambiguous column reference
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
  -- Explicitly qualify the column name to avoid ambiguity with function parameter
  SELECT id, description INTO activity_id, activity_description
  FROM point_activities
  WHERE point_activities.action = award_points.action;
  
  -- Log points history
  INSERT INTO points_history (user_id, activity_id, points, description)
  VALUES (
    user_id, 
    activity_id, 
    points_to_award, 
    COALESCE(activity_description, 'Points awarded for ' || award_points.action)
  );
  
  -- Update user points
  UPDATE profiles 
  SET points = COALESCE(points, 0) + points_to_award
  WHERE id = user_id;
END;
$$;
























