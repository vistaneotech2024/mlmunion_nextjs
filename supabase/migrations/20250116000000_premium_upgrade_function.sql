-- Create function for users to upgrade themselves to premium
CREATE OR REPLACE FUNCTION upgrade_to_premium()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the current user's premium status
  UPDATE profiles 
  SET is_premium = true
  WHERE id = auth.uid();
END;
$$;

-- Add premium upgrade points activity
INSERT INTO point_activities (action, points, description) VALUES
('premium_upgrade_points', -5000, 'Upgrade to premium seller using points')
ON CONFLICT (action) DO UPDATE
SET points = EXCLUDED.points,
    description = EXCLUDED.description;

