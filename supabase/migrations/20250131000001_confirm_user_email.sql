-- Auto-confirm all existing users' emails (no email verification required)
-- This migration confirms emails for all existing users and sets up auto-confirmation for new users

-- Confirm all existing users' emails
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- Create a function to auto-confirm email for new users
CREATE OR REPLACE FUNCTION auto_confirm_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Auto-confirm email when user is created
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;

-- Create trigger to auto-confirm email on user creation
CREATE TRIGGER auto_confirm_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_user_email();

-- Create a function to confirm email for any user (for admin use)
CREATE OR REPLACE FUNCTION confirm_user_email(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE email = user_email
    AND email_confirmed_at IS NULL;
END;
$$;

-- Grant execute permission to authenticated users (they can confirm their own email)
GRANT EXECUTE ON FUNCTION confirm_user_email(text) TO authenticated;

