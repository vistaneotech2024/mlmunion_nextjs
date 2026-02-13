-- Add is_admin column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create policy for admin access
CREATE POLICY "Admins can access all profiles"
ON profiles FOR ALL
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid())
);

-- Create policy for admin access to companies
CREATE POLICY "Admins can manage all companies"
ON mlm_companies FOR ALL
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid())
);

-- Create policy for admin access to blog posts
CREATE POLICY "Admins can manage all blog posts"
ON blog_posts FOR ALL
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid())
);

-- Create policy for admin access to classifieds
CREATE POLICY "Admins can manage all classifieds"
ON classifieds FOR ALL
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid())
);