-- Add company_id column to blog_posts table
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES mlm_companies(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_company_id ON blog_posts(company_id);

-- Add comment to column
COMMENT ON COLUMN blog_posts.company_id IS 'Reference to mlm_companies table for company-related blog posts';

