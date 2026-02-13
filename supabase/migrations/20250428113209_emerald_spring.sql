/*
  # Fix admin_get_stats function

  1. Changes
    - Update admin_get_stats function to properly check admin status
    - Add better error handling
    - Ensure proper security checks
*/

-- Drop existing function
DROP FUNCTION IF EXISTS admin_get_stats();

-- Create updated function with better security checks
CREATE OR REPLACE FUNCTION admin_get_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats json;
  admin_check boolean;
BEGIN
  -- Check if user is admin
  SELECT is_admin INTO admin_check
  FROM profiles
  WHERE id = auth.uid();
  
  IF admin_check IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can access these statistics';
  END IF;

  -- Get user stats
  WITH 
    total_users AS (
      SELECT COUNT(*) AS count FROM profiles
    ),
    active_users AS (
      SELECT COUNT(*) AS count FROM profiles WHERE points > 0
    ),
    new_users AS (
      SELECT COUNT(*) AS count FROM profiles 
      WHERE created_at > (CURRENT_DATE - INTERVAL '30 days')
    ),
    -- Company stats
    total_companies AS (
      SELECT COUNT(*) AS count FROM mlm_companies
    ),
    pending_companies AS (
      SELECT COUNT(*) AS count FROM mlm_companies WHERE status = 'pending'
    ),
    approved_companies AS (
      SELECT COUNT(*) AS count FROM mlm_companies WHERE status = 'approved'
    ),
    -- Blog stats
    total_blogs AS (
      SELECT COUNT(*) AS count FROM blog_posts
    ),
    published_blogs AS (
      SELECT COUNT(*) AS count FROM blog_posts WHERE published = true
    ),
    draft_blogs AS (
      SELECT COUNT(*) AS count FROM blog_posts WHERE published = false
    ),
    -- Classified stats
    total_classifieds AS (
      SELECT COUNT(*) AS count FROM classifieds
    ),
    active_classifieds AS (
      SELECT COUNT(*) AS count FROM classifieds WHERE status = 'active'
    ),
    premium_classifieds AS (
      SELECT COUNT(*) AS count FROM classifieds WHERE is_premium = true
    ),
    -- Seller stats
    total_sellers AS (
      SELECT COUNT(*) AS count FROM profiles WHERE is_direct_seller = true
    ),
    verified_sellers AS (
      SELECT COUNT(*) AS count FROM profiles 
      WHERE is_direct_seller = true AND is_verified = true
    ),
    premium_sellers AS (
      SELECT COUNT(*) AS count FROM profiles 
      WHERE is_direct_seller = true AND is_premium = true
    )
  SELECT json_build_object(
    'users', json_build_object(
      'total', COALESCE((SELECT count FROM total_users), 0),
      'active', COALESCE((SELECT count FROM active_users), 0),
      'new', COALESCE((SELECT count FROM new_users), 0)
    ),
    'companies', json_build_object(
      'total', COALESCE((SELECT count FROM total_companies), 0),
      'pending', COALESCE((SELECT count FROM pending_companies), 0),
      'approved', COALESCE((SELECT count FROM approved_companies), 0)
    ),
    'blogs', json_build_object(
      'total', COALESCE((SELECT count FROM total_blogs), 0),
      'published', COALESCE((SELECT count FROM published_blogs), 0),
      'draft', COALESCE((SELECT count FROM draft_blogs), 0)
    ),
    'classifieds', json_build_object(
      'total', COALESCE((SELECT count FROM total_classifieds), 0),
      'active', COALESCE((SELECT count FROM active_classifieds), 0),
      'premium', COALESCE((SELECT count FROM premium_classifieds), 0)
    ),
    'sellers', json_build_object(
      'total', COALESCE((SELECT count FROM total_sellers), 0),
      'verified', COALESCE((SELECT count FROM verified_sellers), 0),
      'premium', COALESCE((SELECT count FROM premium_sellers), 0)
    )
  ) INTO stats;

  RETURN stats;
END;
$$;