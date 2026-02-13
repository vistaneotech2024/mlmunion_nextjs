-- Fix registration issues:
-- 1. Add country field to handle_new_user trigger
-- 2. Set is_verified = true for email verification and OAuth users

-- Update handle_new_user function to include country and set is_verified for OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_oauth_user boolean;
  email_username text;
BEGIN
  -- Check if this is an OAuth user (has provider metadata)
  is_oauth_user := (
    new.raw_app_meta_data->>'provider' IS NOT NULL 
    AND new.raw_app_meta_data->>'provider' != 'email'
  ) OR (
    new.raw_user_meta_data->>'provider' IS NOT NULL 
    AND new.raw_user_meta_data->>'provider' != 'email'
  );

  -- ALWAYS extract username from email (part before @) - this is the ONLY source
  IF new.email IS NOT NULL THEN
    email_username := SPLIT_PART(new.email, '@', 1);
  ELSE
    email_username := NULL;
  END IF;

  -- Insert profile (points will be set to 0 by default)
  INSERT INTO public.profiles (
    id, 
    username, 
    full_name, 
    avatar_url,
    phone_number,
    country,
    state,
    city,
    email,
    is_direct_seller,
    is_verified  -- Set to true for OAuth users, false for email users (will be verified on email confirmation)
  )
  VALUES (
    new.id,
    email_username,  -- ALWAYS use email-based username
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'city',
    new.email,
    true,  -- Set is_direct_seller to TRUE for all new registrations
    is_oauth_user  -- OAuth users are verified immediately, email users need email verification
  )
  ON CONFLICT (id) DO UPDATE SET
    -- For conflict, ALWAYS extract username from email if it's currently an email
    username = CASE 
      WHEN profiles.username LIKE '%@%' OR profiles.username = COALESCE(EXCLUDED.email, profiles.email) THEN 
        SPLIT_PART(COALESCE(EXCLUDED.email, profiles.email), '@', 1)
      ELSE
        profiles.username  -- Keep existing username if it's not an email
    END,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
    country = COALESCE(EXCLUDED.country, profiles.country),
    state = COALESCE(EXCLUDED.state, profiles.state),
    city = COALESCE(EXCLUDED.city, profiles.city),
    email = COALESCE(EXCLUDED.email, profiles.email),
    is_direct_seller = COALESCE(EXCLUDED.is_direct_seller, profiles.is_direct_seller),
    is_verified = COALESCE(EXCLUDED.is_verified, profiles.is_verified);
  
  -- Award 25 points instantly on registration
  -- This will also log the points in points_history table
  PERFORM public.award_points(new.id, 25, 'user_registration');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify user when email is confirmed
CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS trigger AS $$
BEGIN
  -- When email_confirmed_at is set and user was not verified before, set is_verified = true
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL) THEN
    UPDATE public.profiles
    SET is_verified = true
    WHERE id = NEW.id AND (is_verified = false OR is_verified IS NULL);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to verify user when email is confirmed
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.handle_email_verification();

