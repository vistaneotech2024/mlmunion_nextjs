-- Add premium and verified fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Add premium field to classifieds
ALTER TABLE classifieds
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;

-- Create function to check if a user is premium
CREATE OR REPLACE FUNCTION is_user_premium(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND is_premium = true
  );
END;
$$;

-- Create function to check if a user is verified
CREATE OR REPLACE FUNCTION is_user_verified(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND is_verified = true
  );
END;
$$;

-- Add RLS policies for premium and verified status
CREATE POLICY "Anyone can view premium and verified status"
ON profiles
FOR SELECT
USING (true);

-- Only admins can update premium and verified status
CREATE POLICY "Only admins can update premium and verified status"
ON profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);