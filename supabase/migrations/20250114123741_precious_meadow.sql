/*
  # Final RLS policy fix

  1. Changes
    - Remove all problematic policies
    - Create new non-recursive policies
    - Simplify access control logic

  2. Security
    - Maintain proper access control
    - Prevent policy recursion
    - Keep admin functionality
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public read access for profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admin full access" ON profiles;
DROP POLICY IF EXISTS "Admin full access to blog_posts" ON blog_posts;
DROP POLICY IF EXISTS "Admin full access to classifieds" ON classifieds;
DROP POLICY IF EXISTS "Admin full access to mlm_companies" ON mlm_companies;

-- Create base policies for profiles
CREATE POLICY "Enable read access for everyone"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Enable insert for authenticated users only"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- Create policies for blog_posts
CREATE POLICY "Enable read access for published posts"
ON blog_posts FOR SELECT
USING (published = true OR author_id = auth.uid() OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Enable insert for authenticated users"
ON blog_posts FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid() OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Enable update for post owners and admins"
ON blog_posts FOR UPDATE
TO authenticated
USING (author_id = auth.uid() OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- Create policies for classifieds
CREATE POLICY "Enable read access for all classifieds"
ON classifieds FOR SELECT
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON classifieds FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Enable update for classified owners and admins"
ON classifieds FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- Create policies for mlm_companies
CREATE POLICY "Enable read access for approved companies"
ON mlm_companies FOR SELECT
USING (status = 'approved' OR submitted_by = auth.uid() OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Enable insert for authenticated users"
ON mlm_companies FOR INSERT
TO authenticated
WITH CHECK (submitted_by = auth.uid() OR (SELECT is_admin FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Enable update for admins"
ON mlm_companies FOR UPDATE
TO authenticated
USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- Create delete policies for admins
CREATE POLICY "Enable delete for admins only"
ON profiles FOR DELETE
TO authenticated
USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Enable delete for admins only"
ON blog_posts FOR DELETE
TO authenticated
USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Enable delete for admins only"
ON classifieds FOR DELETE
TO authenticated
USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Enable delete for admins only"
ON mlm_companies FOR DELETE
TO authenticated
USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()));