-- Add review text field to company_votes table
ALTER TABLE public.company_votes
ADD COLUMN IF NOT EXISTS review text;

-- Create index for better query performance when fetching reviews
CREATE INDEX IF NOT EXISTS idx_company_votes_company_created 
ON public.company_votes(company_id, created_at DESC);

