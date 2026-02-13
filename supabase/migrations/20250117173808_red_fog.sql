-- Add view_count column to mlm_companies if it doesn't exist
ALTER TABLE mlm_companies
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Create function to increment company views
CREATE OR REPLACE FUNCTION increment_company_views(company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE mlm_companies
  SET view_count = view_count + 1
  WHERE id = company_id;
END;
$$;