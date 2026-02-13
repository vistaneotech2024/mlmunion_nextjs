/*
  # Fix admin policies and RLS

  1. Changes
    - Simplify admin policies to prevent recursion
    - Add admin-specific functions
    - Add admin status check function

  2. Security
    - Ensure proper access control
    - Prevent policy recursion
    - Add secure admin checks
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view basic profile info" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create a function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
$$;

-- Create new simplified policies for profiles
CREATE POLICY "Public read access for profiles"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admin full access"
ON profiles FOR ALL
USING (is_admin());

-- Update policies for other tables
CREATE POLICY "Admin full access to blog_posts"
ON blog_posts FOR ALL
USING (is_admin());

CREATE POLICY "Admin full access to classifieds"
ON classifieds FOR ALL
USING (is_admin());

CREATE POLICY "Admin full access to mlm_companies"
ON mlm_companies FOR ALL
USING (is_admin());

-- Add admin-specific functions
CREATE OR REPLACE FUNCTION admin_get_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'total_companies', (SELECT count(*) FROM mlm_companies),
    'total_blogs', (SELECT count(*) FROM blog_posts),
    'total_classifieds', (SELECT count(*) FROM classifieds),
    'pending_companies', (SELECT count(*) FROM mlm_companies WHERE status = 'pending'),
    'pending_blogs', (SELECT count(*) FROM blog_posts WHERE published = false)
  ) INTO stats;

  RETURN stats;
END;
$$;