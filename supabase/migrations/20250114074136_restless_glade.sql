-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.award_points;

-- Create updated function to award points with renamed parameter
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
  -- Update user points using the renamed parameter
  UPDATE profiles 
  SET points = COALESCE(points, 0) + points_to_award
  WHERE id = user_id;
END;
$$;