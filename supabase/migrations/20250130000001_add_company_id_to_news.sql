-- Add company_id column to news table
ALTER TABLE news
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES mlm_companies(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_news_company_id ON news(company_id);

-- Add comment to column
COMMENT ON COLUMN news.company_id IS 'Reference to mlm_companies table for company-related news';

