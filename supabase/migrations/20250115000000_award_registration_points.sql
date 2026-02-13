/*
  # Award 25 Points on User Registration

  1. Changes
    - Add user_registration activity to point_activities table
    - Update handle_new_user() function to award 25 points when user registers

  2. Points System
    - User registration: 25 points (instant)
*/

-- Insert user_registration activity if it doesn't exist
INSERT INTO point_activities (action, points, description) VALUES
('user_registration', 25, 'Register a new account')
ON CONFLICT (action) DO UPDATE
SET points = EXCLUDED.points,
    description = EXCLUDED.description;

-- Update handle_new_user function to award 25 points on registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile (points will be set to 0 by default)
  INSERT INTO public.profiles (
    id, 
    username, 
    full_name, 
    avatar_url,
    phone_number,
    state,
    city,
    email,
    is_direct_seller
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', new.email),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'city',
    new.email,
    true  -- Set is_direct_seller to TRUE for all new registrations
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, profiles.username),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
    state = COALESCE(EXCLUDED.state, profiles.state),
    city = COALESCE(EXCLUDED.city, profiles.city),
    email = COALESCE(EXCLUDED.email, profiles.email),
    is_direct_seller = COALESCE(EXCLUDED.is_direct_seller, profiles.is_direct_seller);
  
  -- Award 25 points instantly on registration
  -- This will also log the points in points_history table
  PERFORM public.award_points(new.id, 25, 'user_registration');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

