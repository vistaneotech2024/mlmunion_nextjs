-- Add is_verified column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_verified boolean DEFAULT false;
  END IF;
END $$;

-- Add phone_verified column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;
END $$;

-- Create a function to check if a user's contact info is verified
CREATE OR REPLACE FUNCTION check_contact_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user is a direct seller
  IF NEW.is_direct_seller = true THEN
    -- Check if email is verified (from auth.users)
    IF EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = NEW.id
      AND email_confirmed_at IS NOT NULL
    ) OR
    -- Check if phone number is verified
    NEW.phone_verified = true THEN
      -- Set verified status to true
      NEW.is_verified := true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run the check on profile updates
DROP TRIGGER IF EXISTS check_contact_verification_trigger ON profiles;
CREATE TRIGGER check_contact_verification_trigger
  BEFORE INSERT OR UPDATE OF is_direct_seller, phone_verified
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_contact_verification();

-- Create function to verify phone number
CREATE OR REPLACE FUNCTION verify_phone_number(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update phone verification status
  UPDATE profiles
  SET phone_verified = true
  WHERE id = user_id;
END;
$$;

-- Create function to check verification status
CREATE OR REPLACE FUNCTION get_verification_status(user_id uuid)
RETURNS TABLE (
  is_verified boolean,
  email_verified boolean,
  phone_verified boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.is_verified,
    (u.email_confirmed_at IS NOT NULL) as email_verified,
    p.phone_verified
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = user_id;
END;
$$;