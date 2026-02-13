-- Fix RLS Policies for countries_v2, states_v2, and cities_v2
-- Allow public read access (both authenticated and anonymous users)

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Allow read access to countries_v2" ON countries_v2;
DROP POLICY IF EXISTS "Allow read access to states_v2" ON states_v2;
DROP POLICY IF EXISTS "Allow read access to cities_v2" ON cities_v2;
DROP POLICY IF EXISTS "Allow anonymous read access to countries_v2" ON countries_v2;
DROP POLICY IF EXISTS "Allow anonymous read access to states_v2" ON states_v2;
DROP POLICY IF EXISTS "Allow anonymous read access to cities_v2" ON cities_v2;
DROP POLICY IF EXISTS "Allow public read access to countries_v2" ON countries_v2;
DROP POLICY IF EXISTS "Allow public read access to states_v2" ON states_v2;
DROP POLICY IF EXISTS "Allow public read access to cities_v2" ON cities_v2;

-- Create public read policies (allows both authenticated and anonymous users)
CREATE POLICY "Allow public read access to countries_v2" ON countries_v2
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to states_v2" ON states_v2
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to cities_v2" ON cities_v2
  FOR SELECT USING (true);

-- Create helper functions for querying V2 tables
CREATE OR REPLACE FUNCTION get_states_v2_by_country(country_code_param TEXT)
RETURNS TABLE (id INTEGER, name TEXT, state_code TEXT, country_code TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.state_code, s.country_code
  FROM states_v2 s
  WHERE s.country_code = country_code_param
  ORDER BY s.name;
$$;

CREATE OR REPLACE FUNCTION get_cities_v2_by_state(state_code_param TEXT)
RETURNS TABLE (id INTEGER, name TEXT, state_code TEXT, country_code TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.state_code, c.country_code
  FROM cities_v2 c
  WHERE c.state_code = state_code_param
  ORDER BY c.name;
$$;

CREATE OR REPLACE FUNCTION get_cities_v2_by_country(country_code_param TEXT)
RETURNS TABLE (id INTEGER, name TEXT, state_code TEXT, state_name TEXT, country_code TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.state_code, c.state_name, c.country_code
  FROM cities_v2 c
  WHERE c.country_code = country_code_param
  ORDER BY c.name;
$$;

