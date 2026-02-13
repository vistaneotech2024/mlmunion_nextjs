/*
  # Income Verification System

  1. New Tables
    - `income_verifications` - Stores income verification submissions
    - `income_documents` - Stores document references for income verification

  2. Security
    - Enable RLS on all tables
    - Add policies for user access
*/

-- Create income_verifications table
CREATE TABLE IF NOT EXISTS income_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  income_type text NOT NULL CHECK (income_type IN ('monthly', 'annual')),
  income_amount integer NOT NULL,
  currency text NOT NULL,
  company_name text NOT NULL,
  position text NOT NULL,
  tenure integer NOT NULL,
  tenure_unit text NOT NULL CHECK (tenure_unit IN ('months', 'years')),
  success_story text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  preferred_contact text NOT NULL CHECK (preferred_contact IN ('email', 'phone')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  review_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create income_documents table
CREATE TABLE IF NOT EXISTS income_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid REFERENCES income_verifications(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- Create storage bucket for income proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('income-proofs', 'income-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE income_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for income_verifications
CREATE POLICY "Users can view their own income verifications"
  ON income_verifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own income verifications"
  ON income_verifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all income verifications"
  ON income_verifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ));

CREATE POLICY "Admins can update income verifications"
  ON income_verifications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ));

-- Create policies for income_documents
CREATE POLICY "Users can view their own income documents"
  ON income_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM income_verifications
    WHERE income_verifications.id = income_documents.verification_id
    AND income_verifications.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own income documents"
  ON income_documents FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM income_verifications
    WHERE income_verifications.id = income_documents.verification_id
    AND income_verifications.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all income documents"
  ON income_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ));

-- Create storage policies for income proofs
CREATE POLICY "Users can upload their own income proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'income-proofs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own income proofs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'income-proofs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can view all income proofs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'income-proofs' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Add income verification fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_income_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS income_level text,
ADD COLUMN IF NOT EXISTS income_verified_at timestamptz;

-- Create function to approve income verification
CREATE OR REPLACE FUNCTION approve_income_verification(
  verification_id uuid,
  income_level text,
  review_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can approve income verifications';
  END IF;

  -- Get user_id from verification
  SELECT income_verifications.user_id INTO user_id
  FROM income_verifications
  WHERE id = verification_id;

  -- Update verification status
  UPDATE income_verifications
  SET 
    status = 'approved',
    reviewer_id = auth.uid(),
    review_notes = approve_income_verification.review_notes,
    updated_at = now()
  WHERE id = verification_id;

  -- Update user profile
  UPDATE profiles
  SET 
    is_income_verified = true,
    income_level = approve_income_verification.income_level,
    income_verified_at = now()
  WHERE id = user_id;

  -- Create notification for user
  INSERT INTO notifications (
    user_id,
    title,
    message
  ) VALUES (
    user_id,
    'Income Verification Approved',
    'Congratulations! Your income verification has been approved. Your profile now displays your verified income level.'
  );
END;
$$;

-- Create function to reject income verification
CREATE OR REPLACE FUNCTION reject_income_verification(
  verification_id uuid,
  review_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can reject income verifications';
  END IF;

  -- Get user_id from verification
  SELECT income_verifications.user_id INTO user_id
  FROM income_verifications
  WHERE id = verification_id;

  -- Update verification status
  UPDATE income_verifications
  SET 
    status = 'rejected',
    reviewer_id = auth.uid(),
    review_notes = reject_income_verification.review_notes,
    updated_at = now()
  WHERE id = verification_id;

  -- Create notification for user
  INSERT INTO notifications (
    user_id,
    title,
    message
  ) VALUES (
    user_id,
    'Income Verification Rejected',
    'Your income verification has been rejected. Please review the feedback and submit again: ' || review_notes
  );
END;
$$;

-- Create function to get income verification status
CREATE OR REPLACE FUNCTION get_income_verification_status(user_id uuid)
RETURNS TABLE (
  is_verified boolean,
  income_level text,
  verified_at timestamptz,
  pending_verification boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.is_income_verified,
    p.income_level,
    p.income_verified_at,
    EXISTS (
      SELECT 1 FROM income_verifications
      WHERE user_id = get_income_verification_status.user_id
      AND status = 'pending'
    ) as pending_verification
  FROM profiles p
  WHERE p.id = get_income_verification_status.user_id;
END;
$$;