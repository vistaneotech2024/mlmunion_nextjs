/*
  # Referral Program: Award Points for Inviting New Users

  1. Changes
    - Add referred_by column to profiles
    - Ensure refer_user point activity exists and is set to 250 points
    - Update handle_new_user() to:
        * Store referrer on the new profile (if provided in user metadata)
        * Award 25 points for own registration (existing behavior)
        * Award 250 points to referrer when a user signs up with a referral link
*/

-- Add referred_by column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
      AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE profiles
      ADD COLUMN referred_by uuid;
  END IF;
END $$;

-- Add foreign key constraint for referred_by if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_referred_by_fkey'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_referred_by_fkey
      FOREIGN KEY (referred_by) REFERENCES profiles(id);
  END IF;
END $$;

-- Ensure refer_user activity exists with 250 points
INSERT INTO point_activities (action, points, description) VALUES
('refer_user', 250, 'Refer a new user who completes registration')
ON CONFLICT (action) DO UPDATE
SET points = EXCLUDED.points,
    description = EXCLUDED.description;

-- Update handle_new_user function to support referrals
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_oauth_user boolean;
  email_username text;
  referrer_id uuid;
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

  -- Read referrer from user metadata if provided (e.g., from signup referral link)
  referrer_id := NULL;
  BEGIN
    IF new.raw_user_meta_data ? 'referred_by' THEN
      referrer_id := (new.raw_user_meta_data->>'referred_by')::uuid;
    END IF;
  EXCEPTION WHEN others THEN
    -- If casting fails or metadata is malformed, ignore referrer
    referrer_id := NULL;
  END;

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
    is_verified,
    referred_by  -- store who referred this user (if any)
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
    true,            -- Set is_direct_seller to TRUE for all new registrations
    is_oauth_user,   -- OAuth users are verified immediately, email users need email verification
    referrer_id
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
    is_verified = COALESCE(EXCLUDED.is_verified, profiles.is_verified),
    referred_by = COALESCE(EXCLUDED.referred_by, profiles.referred_by);
  
  -- Award 25 points instantly on registration (existing behavior)
  -- This will also log the points in points_history table
  PERFORM public.award_points(new.id, 25, 'user_registration');

  -- If this user was referred by someone else, award points to the referrer
  IF referrer_id IS NOT NULL AND referrer_id <> new.id THEN
    PERFORM public.award_points(referrer_id, 250, 'refer_user');
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


