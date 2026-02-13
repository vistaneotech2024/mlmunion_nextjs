-- Insert messages page content if it doesn't exist
INSERT INTO page_content (page, title, content, slug, is_published)
VALUES 
  ('messages',
   'Messages',
   '<h2>Messages</h2>
    <p>Welcome to your messages center. Here you can view and manage all your communications with other members of the MLM Union community.</p>
    <h3>How It Works</h3>
    <ul>
      <li>Connect with other members through the Direct Sellers directory</li>
      <li>Send and receive messages about business opportunities</li>
      <li>Build your network and grow your business</li>
    </ul>
    <p>To get started, browse our <a href="/direct-sellers">Direct Sellers directory</a> and connect with members who share your interests.</p>',
   'messages',
   true)
ON CONFLICT (page) DO UPDATE
SET 
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_published = EXCLUDED.is_published;

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

-- Create function to log access attempts
CREATE OR REPLACE FUNCTION log_access_attempt(
  p_user_id uuid,
  p_path text,
  p_success boolean,
  p_details text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO access_logs (
    user_id,
    path,
    success,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_path,
    p_success,
    p_details,
    p_ip_address,
    p_user_agent
  );
END;
$$;