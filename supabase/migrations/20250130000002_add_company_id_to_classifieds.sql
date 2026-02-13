-- Add company_id column to classifieds table
ALTER TABLE classifieds
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES mlm_companies(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_classifieds_company_id ON classifieds(company_id);

-- Add comment to column
COMMENT ON COLUMN classifieds.company_id IS 'Reference to mlm_companies table for company-related classifieds';

