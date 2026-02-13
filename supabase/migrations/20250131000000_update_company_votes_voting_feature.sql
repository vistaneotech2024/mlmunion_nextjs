-- Update company_votes table to add voting field and enforce 1-year restriction
-- This migration updates the company_votes table structure and adds functions to enforce voting rules

-- Add voting boolean field if it doesn't exist
ALTER TABLE public.company_votes
ADD COLUMN IF NOT EXISTS voting boolean DEFAULT true;

-- Update existing records: if review is NULL or empty, set voting = true (these are votes)
-- If review exists, set voting = false (these are reviews)
UPDATE public.company_votes
SET voting = CASE 
  WHEN review IS NULL OR review = '' THEN true
  ELSE false
END
WHERE voting IS NULL;

-- Update the table structure to match the provided schema
-- Ensure all indexes exist
CREATE INDEX IF NOT EXISTS idx_company_votes_company 
ON public.company_votes USING btree (company_id);

CREATE INDEX IF NOT EXISTS idx_company_votes_user 
ON public.company_votes USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_company_votes_company_rating 
ON public.company_votes USING btree (company_id, rating);

CREATE INDEX IF NOT EXISTS idx_company_votes_company_created 
ON public.company_votes USING btree (company_id, created_at DESC);

-- Create function to check if user can vote for a company (1-year restriction)
CREATE OR REPLACE FUNCTION can_user_vote_company(
  p_user_id uuid,
  p_company_id uuid
)
RETURNS TABLE (
  can_vote boolean,
  last_vote_date timestamptz,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_vote timestamptz;
  v_one_year_ago timestamptz;
BEGIN
  -- Get the last vote date for this user and company (only votes where voting = true, not reviews)
  SELECT created_at INTO v_last_vote
  FROM company_votes
  WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND voting = true -- Only count votes where voting is explicitly true
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no vote exists, user can vote
  IF v_last_vote IS NULL THEN
    RETURN QUERY SELECT true, NULL::timestamptz, 'You can vote for this company'::text;
    RETURN;
  END IF;

  -- Calculate one year ago from now
  v_one_year_ago := NOW() - INTERVAL '1 year';

  -- Check if last vote was more than 1 year ago
  IF v_last_vote < v_one_year_ago THEN
    RETURN QUERY SELECT true, v_last_vote, 'You can vote for this company again'::text;
  ELSE
    RETURN QUERY SELECT false, v_last_vote, 
      format('You can vote for this company again after %s', 
        (v_last_vote + INTERVAL '1 year')::date)::text;
  END IF;
END;
$$;

-- Create function to submit a vote with 1-year restriction check
CREATE OR REPLACE FUNCTION submit_company_vote(
  p_user_id uuid,
  p_company_id uuid,
  p_rating integer,
  p_review text DEFAULT NULL,
  p_voting boolean DEFAULT true
)
RETURNS TABLE (
  success boolean,
  message text,
  vote_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_vote boolean;
  v_last_vote_date timestamptz;
  v_message text;
  v_existing_vote_id uuid;
  v_one_year_ago timestamptz;
  v_existing_voting boolean;
BEGIN
  -- Validate rating
  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN QUERY SELECT false, 'Rating must be between 1 and 5'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Check if user can vote
  SELECT vote_check.can_vote, vote_check.last_vote_date, vote_check.message 
  INTO v_can_vote, v_last_vote_date, v_message
  FROM can_user_vote_company(p_user_id, p_company_id) AS vote_check;

  IF NOT v_can_vote THEN
    RETURN QUERY SELECT false, v_message, NULL::uuid;
    RETURN;
  END IF;

  -- Calculate one year ago
  v_one_year_ago := NOW() - INTERVAL '1 year';

  -- Check if ANY row exists (vote or review) - due to UNIQUE constraint, only one row per user/company
  SELECT id, voting, created_at 
  INTO v_existing_vote_id, v_existing_voting, v_last_vote_date
  FROM company_votes
  WHERE user_id = p_user_id
    AND company_id = p_company_id
  LIMIT 1;

  -- If row exists, check if it's a vote and if we can update
  IF v_existing_vote_id IS NOT NULL THEN
    -- Check if this is a vote (voting = true or NULL) and if it's within 1 year
    IF (v_existing_voting = true OR v_existing_voting IS NULL) THEN
      -- This is/was a vote, check 1-year restriction
      IF v_last_vote_date < v_one_year_ago THEN
        -- Can vote again - update existing row to be a vote
        UPDATE company_votes
        SET rating = p_rating,
            review = COALESCE(p_review, review), -- Preserve existing review if no new review provided
            voting = p_voting,
            created_at = NOW()
        WHERE id = v_existing_vote_id;
        
        RETURN QUERY SELECT true, 'Vote submitted successfully'::text, v_existing_vote_id;
      ELSE
        -- Cannot vote again within 1 year
        RETURN QUERY SELECT false, 
          format('You can vote for this company again after %s', 
            (v_last_vote_date + INTERVAL '1 year')::date)::text, 
          NULL::uuid;
      END IF;
    ELSE
      -- This is a review (voting = false), convert it to a vote (user can always vote, even if they have a review)
      UPDATE company_votes
      SET rating = p_rating,
          review = COALESCE(p_review, review), -- Preserve existing review
          voting = p_voting,
          created_at = NOW()
      WHERE id = v_existing_vote_id;
      
      RETURN QUERY SELECT true, 'Vote submitted successfully'::text, v_existing_vote_id;
    END IF;
  ELSE
    -- No row exists, insert new vote
    INSERT INTO company_votes (user_id, company_id, rating, review, voting, created_at)
    VALUES (p_user_id, p_company_id, p_rating, p_review, p_voting, NOW())
    RETURNING id INTO v_existing_vote_id;
    
    RETURN QUERY SELECT true, 'Vote submitted successfully'::text, v_existing_vote_id;
  END IF;
END;
$$;

-- Update RLS policies
-- Drop all existing policies for company_votes to avoid conflicts
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'company_votes' 
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON company_votes', r.policyname);
  END LOOP;
END $$;

-- Allow authenticated users to insert their own votes
-- The 1-year restriction is enforced by the submit_company_vote function
CREATE POLICY "Users can insert their own votes"
  ON company_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own votes
-- The 1-year restriction is enforced by the submit_company_vote function
CREATE POLICY "Users can update their own votes"
  ON company_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view all votes
CREATE POLICY "Users can view all company votes"
  ON company_votes FOR SELECT
  USING (true);

-- Create function to get company vote count (only votes where voting = true, not reviews)
CREATE OR REPLACE FUNCTION get_company_vote_count(company_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(COUNT(*), 0)
    FROM company_votes
    WHERE company_votes.company_id = $1
      AND (voting = true OR (voting IS NULL AND (review IS NULL OR review = ''))) -- Count votes (voting=true or NULL with no review)
  );
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION can_user_vote_company(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_company_vote(uuid, uuid, integer, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_vote_count(uuid) TO authenticated, anon;

