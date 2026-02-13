-- Set is_direct_seller to TRUE by default for all new user registrations
-- This ensures every new user is automatically marked as a direct seller

-- Update handle_new_user function to set is_direct_seller = true
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
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
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the default value in the table schema for consistency
ALTER TABLE profiles 
ALTER COLUMN is_direct_seller SET DEFAULT true;

