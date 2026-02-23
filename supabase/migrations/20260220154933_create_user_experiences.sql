/*
  # User Experiences Table

  Creates a table to store user work experiences, similar to LinkedIn profiles.
  
  Fields:
  - id: Primary key
  - user_id: Foreign key to profiles table
  - title: Job title/position
  - company: Company name (optional)
  - description: Job description (optional)
  - start_date: Start date (required)
  - end_date: End date (optional, null if current position)
  - is_current: Boolean flag for current position
  - created_at: Timestamp when record was created
  - updated_at: Timestamp when record was last updated
*/

-- Create user_experiences table
CREATE TABLE IF NOT EXISTS user_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  company text,
  description text,
  start_date date NOT NULL,
  end_date date,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_user_experiences_user_id ON user_experiences(user_id);

-- Create index on start_date for sorting
CREATE INDEX IF NOT EXISTS idx_user_experiences_start_date ON user_experiences(start_date DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_experiences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all experiences (public read)
CREATE POLICY "Users can view all experiences"
  ON user_experiences
  FOR SELECT
  USING (true);

-- Policy: Users can insert their own experiences
CREATE POLICY "Users can insert their own experiences"
  ON user_experiences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own experiences
CREATE POLICY "Users can update their own experiences"
  ON user_experiences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own experiences
CREATE POLICY "Users can delete their own experiences"
  ON user_experiences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_experiences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_experiences_updated_at
  BEFORE UPDATE ON user_experiences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_experiences_updated_at();

-- Add constraint to ensure end_date is after start_date (if both are provided)
CREATE OR REPLACE FUNCTION check_experience_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date IS NOT NULL AND NEW.start_date > NEW.end_date THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_experience_dates_trigger
  BEFORE INSERT OR UPDATE ON user_experiences
  FOR EACH ROW
  EXECUTE FUNCTION check_experience_dates();
