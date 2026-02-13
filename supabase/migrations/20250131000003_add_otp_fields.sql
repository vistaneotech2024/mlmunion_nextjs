/*
  # Add OTP fields for password reset

  1. Changes
    - Add otp_code column to profiles table (stores the OTP)
    - Add otp_expires_at column to profiles table (stores OTP expiration time)
    
  2. Security
    - OTP expires after 10 minutes
    - OTP is cleared after successful password reset
*/

-- Add OTP fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS otp_code text,
ADD COLUMN IF NOT EXISTS otp_expires_at timestamptz;

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_profiles_otp_code ON profiles(otp_code) WHERE otp_code IS NOT NULL;

-- Create function to clear expired OTPs (can be called periodically)
CREATE OR REPLACE FUNCTION clear_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET otp_code = NULL,
      otp_expires_at = NULL
  WHERE otp_expires_at IS NOT NULL
    AND otp_expires_at < now();
END;
$$;

-- Create function to verify and clear OTP
CREATE OR REPLACE FUNCTION verify_and_clear_otp(user_email text, provided_otp text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id_val uuid;
  stored_otp text;
  expires_at_val timestamptz;
BEGIN
  -- Get user profile with OTP
  SELECT id, otp_code, otp_expires_at INTO user_id_val, stored_otp, expires_at_val
  FROM profiles
  WHERE email = user_email;
  
  -- Check if user exists
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check if OTP exists
  IF stored_otp IS NULL THEN
    RAISE EXCEPTION 'No OTP found. Please request a new one.';
  END IF;
  
  -- Check if OTP is expired
  IF expires_at_val IS NULL OR expires_at_val < now() THEN
    RAISE EXCEPTION 'OTP has expired. Please request a new one.';
  END IF;
  
  -- Check if OTP matches
  IF stored_otp != provided_otp THEN
    RAISE EXCEPTION 'Invalid OTP. Please check and try again.';
  END IF;
  
  -- Clear OTP
  UPDATE profiles
  SET otp_code = NULL,
      otp_expires_at = NULL
  WHERE id = user_id_val;
  
  RETURN user_id_val;
END;
$$;

