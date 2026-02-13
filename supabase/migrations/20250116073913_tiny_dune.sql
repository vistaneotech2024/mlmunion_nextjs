-- Create company_votes table
CREATE TABLE IF NOT EXISTS company_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES mlm_companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Enable RLS
ALTER TABLE company_votes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all company votes"
  ON company_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can vote once per company"
  ON company_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
  ON company_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to get company rating
CREATE OR REPLACE FUNCTION get_company_rating(company_id uuid)
RETURNS TABLE (
  average_rating numeric,
  total_votes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating)::numeric, 1) as average_rating,
    COUNT(*) as total_votes
  FROM company_votes
  WHERE company_votes.company_id = $1;
END;
$$;

-- Add indexes for better performance
CREATE INDEX idx_company_votes_company ON company_votes(company_id);
CREATE INDEX idx_company_votes_user ON company_votes(user_id);