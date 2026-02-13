-- Create RPC Functions for V2 Tables
-- Run this in Supabase SQL Editor to create the required functions

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_states_v2_by_country(TEXT);
DROP FUNCTION IF EXISTS get_cities_v2_by_state(TEXT);
DROP FUNCTION IF EXISTS get_cities_v2_by_country(TEXT);
DROP FUNCTION IF EXISTS get_cities_v2_by_ids(INTEGER, INTEGER);

-- Create function to get states by country code
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

-- Create function to get cities by state code
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

-- Create function to get cities by country code
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

-- Create function to get cities by country_id and state_id
CREATE OR REPLACE FUNCTION get_cities_v2_by_ids(country_id_param INTEGER, state_id_param INTEGER)
RETURNS TABLE (id INTEGER, name TEXT, state_id INTEGER, state_code TEXT, state_name TEXT, country_id INTEGER, country_code TEXT, country_name TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.state_id, c.state_code, c.state_name, c.country_id, c.country_code, c.country_name, c.latitude, c.longitude
  FROM cities_v2 c
  WHERE c.country_id = country_id_param
    AND c.state_id = state_id_param
  ORDER BY c.name;
$$;

-- Verify functions were created
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_states_v2_by_country',
    'get_cities_v2_by_state',
    'get_cities_v2_by_country',
    'get_cities_v2_by_ids'
  )
ORDER BY routine_name;

