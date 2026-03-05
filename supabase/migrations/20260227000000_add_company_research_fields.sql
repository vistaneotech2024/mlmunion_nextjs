-- Add research-related fields to mlm_companies if they do not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mlm_companies' AND column_name = 'research_status'
  ) THEN
    ALTER TABLE public.mlm_companies
      ADD COLUMN research_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mlm_companies' AND column_name = 'research_attempts'
  ) THEN
    ALTER TABLE public.mlm_companies
      ADD COLUMN research_attempts integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mlm_companies' AND column_name = 'research_error'
  ) THEN
    ALTER TABLE public.mlm_companies
      ADD COLUMN research_error text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mlm_companies' AND column_name = 'last_researched_at'
  ) THEN
    ALTER TABLE public.mlm_companies
      ADD COLUMN last_researched_at timestamptz;
  END IF;
END $$;

