-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_company_rating;

-- Create updated function to get company rating that handles no votes
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
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0.0) as average_rating,
    COALESCE(COUNT(*), 0) as total_votes
  FROM company_votes
  WHERE company_votes.company_id = $1;
END;
$$;

-- Add index for better performance if not exists
CREATE INDEX IF NOT EXISTS idx_company_votes_company_rating 
ON company_votes(company_id, rating);