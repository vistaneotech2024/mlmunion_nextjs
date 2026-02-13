/*
  # API Keys Management Table
  
  1. New Table
    - `api_keys` - Stores API keys for AI services (GPT, Gemini, etc.)
      - `id` (uuid, primary key)
      - `provider` (text) - The AI provider (gpt, gemini, claude, etc.)
      - `model` (text) - The model name (gpt-4, gemini-pro, etc.)
      - `api_key` (text) - The API key (encrypted/stored securely)
      - `is_active` (boolean) - Whether this API key is currently in use
      - `name` (text) - Optional name/description for the key
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `api_keys` table
    - Only admins can view, insert, update, delete API keys
*/

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('gpt', 'gemini', 'claude', 'other')),
  model text NOT NULL,
  api_key text NOT NULL,
  is_active boolean DEFAULT false,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view active API keys (for AI generation)
-- Admins can view all API keys (including inactive ones)
CREATE POLICY "Users can view active API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (
    is_active = true OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Only admins can insert API keys
CREATE POLICY "Only admins can insert API keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Only admins can update API keys
CREATE POLICY "Only admins can update API keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Only admins can delete API keys
CREATE POLICY "Only admins can delete API keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on update
CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();

-- Create function to ensure only one active key per provider+model combination
CREATE OR REPLACE FUNCTION ensure_single_active_api_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate other keys with the same provider and model
    UPDATE api_keys
    SET is_active = false
    WHERE provider = NEW.provider
      AND model = NEW.model
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure only one active key per provider+model
CREATE TRIGGER ensure_single_active_api_key_trigger
  BEFORE INSERT OR UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_api_key();

