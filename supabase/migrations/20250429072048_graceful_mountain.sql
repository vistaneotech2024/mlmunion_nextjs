-- Create access_logs table for tracking access attempts if it doesn't exist
CREATE TABLE IF NOT EXISTS access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  path text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  details text,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on access_logs if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'access_logs' AND rowsecurity = true
  ) THEN
    ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist to avoid conflicts
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'access_logs' AND policyname = 'Only admins can view access logs'
  ) THEN
    DROP POLICY "Only admins can view access logs" ON access_logs;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'access_logs' AND policyname = 'Allow authenticated users to insert logs'
  ) THEN
    DROP POLICY "Allow authenticated users to insert logs" ON access_logs;
  END IF;
END $$;

-- Create policies for access_logs
CREATE POLICY "Only admins can view access logs"
  ON access_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ));

-- Add policy to allow authenticated users to insert logs
CREATE POLICY "Allow authenticated users to insert logs"
  ON access_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);