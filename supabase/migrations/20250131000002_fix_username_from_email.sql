-- Fix username to always use email part before @ symbol
-- Update handle_new_user function to extract username from email

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  email_username text;
BEGIN
  -- ALWAYS extract username from email (part before @) - this is the ONLY source
  IF new.email IS NOT NULL THEN
    email_username := SPLIT_PART(new.email, '@', 1);
  ELSE
    email_username := NULL;
  END IF;

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
    email_username,  -- ALWAYS use email-based username
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'city',
    new.email,
    true  -- Set is_direct_seller to TRUE for all new registrations
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
    state = COALESCE(EXCLUDED.state, profiles.state),
    city = COALESCE(EXCLUDED.city, profiles.city),
    email = COALESCE(EXCLUDED.email, profiles.email),
    is_direct_seller = COALESCE(EXCLUDED.is_direct_seller, profiles.is_direct_seller);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing profiles to fix usernames that are full emails
UPDATE public.profiles
SET username = SPLIT_PART(email, '@', 1)
WHERE email IS NOT NULL 
  AND username LIKE '%@%'
  AND username = email;

