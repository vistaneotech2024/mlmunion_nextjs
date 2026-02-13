-- Add url column to classifieds table
ALTER TABLE classifieds
ADD COLUMN IF NOT EXISTS url text;

-- Update RLS policies to include url column
DROP POLICY IF EXISTS "Enable read access for all classifieds" ON classifieds;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON classifieds;
DROP POLICY IF EXISTS "Enable update for classified owners and admins" ON classifieds;

CREATE POLICY "Enable read access for all classifieds"
ON classifieds FOR SELECT
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON classifieds FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for classified owners and admins"
ON classifieds FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_classifieds_url ON classifieds(url);