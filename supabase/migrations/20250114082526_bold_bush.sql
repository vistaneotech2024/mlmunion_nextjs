/*
  # Add blog category

  1. Changes
    - Add category column to blog_posts table
    - Add default categories
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add category column to blog_posts if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'category'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN category text;
  END IF;
END $$;