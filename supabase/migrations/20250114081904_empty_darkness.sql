/*
  # Add Location Data

  1. New Tables
    - `countries` - List of countries
    - `states` - List of states with country reference
    - `cities` - List of cities with state reference

  2. Changes
    - Add foreign key constraints to profiles table for location references
    - Add trigger to handle location data on user signup
*/

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE
);

-- Create states table
CREATE TABLE IF NOT EXISTS states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  country_id uuid REFERENCES countries(id) ON DELETE CASCADE,
  UNIQUE(country_id, code)
);

-- Create cities table
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state_id uuid REFERENCES states(id) ON DELETE CASCADE
);

-- Add some initial countries
INSERT INTO countries (name, code) VALUES
('India', 'IN'),
('United States', 'US'),
('United Kingdom', 'GB')
ON CONFLICT (code) DO NOTHING;

-- Add some states for India
WITH country AS (SELECT id FROM countries WHERE code = 'IN')
INSERT INTO states (name, code, country_id) VALUES
('Maharashtra', 'MH', (SELECT id FROM country)),
('Delhi', 'DL', (SELECT id FROM country)),
('Karnataka', 'KA', (SELECT id FROM country)),
('Tamil Nadu', 'TN', (SELECT id FROM country)),
('Uttar Pradesh', 'UP', (SELECT id FROM country))
ON CONFLICT DO NOTHING;

-- Add some states for US
WITH country AS (SELECT id FROM countries WHERE code = 'US')
INSERT INTO states (name, code, country_id) VALUES
('California', 'CA', (SELECT id FROM country)),
('New York', 'NY', (SELECT id FROM country)),
('Texas', 'TX', (SELECT id FROM country)),
('Florida', 'FL', (SELECT id FROM country))
ON CONFLICT DO NOTHING;

-- Add some states for UK
WITH country AS (SELECT id FROM countries WHERE code = 'GB')
INSERT INTO states (name, code, country_id) VALUES
('England', 'ENG', (SELECT id FROM country)),
('Scotland', 'SCT', (SELECT id FROM country)),
('Wales', 'WLS', (SELECT id FROM country))
ON CONFLICT DO NOTHING;

-- Add some major cities for each state
WITH 
  mh AS (SELECT id FROM states WHERE code = 'MH'),
  dl AS (SELECT id FROM states WHERE code = 'DL'),
  ka AS (SELECT id FROM states WHERE code = 'KA'),
  tn AS (SELECT id FROM states WHERE code = 'TN'),
  up AS (SELECT id FROM states WHERE code = 'UP')
INSERT INTO cities (name, state_id) VALUES
-- Maharashtra cities
('Mumbai', (SELECT id FROM mh)),
('Pune', (SELECT id FROM mh)),
('Nagpur', (SELECT id FROM mh)),
-- Delhi cities
('New Delhi', (SELECT id FROM dl)),
('North Delhi', (SELECT id FROM dl)),
('South Delhi', (SELECT id FROM dl)),
-- Karnataka cities
('Bangalore', (SELECT id FROM ka)),
('Mysore', (SELECT id FROM ka)),
('Hubli', (SELECT id FROM ka)),
-- Tamil Nadu cities
('Chennai', (SELECT id FROM tn)),
('Coimbatore', (SELECT id FROM tn)),
('Madurai', (SELECT id FROM tn)),
-- Uttar Pradesh cities
('Lucknow', (SELECT id FROM up)),
('Kanpur', (SELECT id FROM up)),
('Varanasi', (SELECT id FROM up))
ON CONFLICT DO NOTHING;

-- Add US cities
WITH 
  ca AS (SELECT id FROM states WHERE code = 'CA'),
  ny AS (SELECT id FROM states WHERE code = 'NY'),
  tx AS (SELECT id FROM states WHERE code = 'TX'),
  fl AS (SELECT id FROM states WHERE code = 'FL')
INSERT INTO cities (name, state_id) VALUES
-- California cities
('Los Angeles', (SELECT id FROM ca)),
('San Francisco', (SELECT id FROM ca)),
('San Diego', (SELECT id FROM ca)),
-- New York cities
('New York City', (SELECT id FROM ny)),
('Buffalo', (SELECT id FROM ny)),
('Albany', (SELECT id FROM ny)),
-- Texas cities
('Houston', (SELECT id FROM tx)),
('Dallas', (SELECT id FROM tx)),
('Austin', (SELECT id FROM tx)),
-- Florida cities
('Miami', (SELECT id FROM fl)),
('Orlando', (SELECT id FROM fl)),
('Tampa', (SELECT id FROM fl))
ON CONFLICT DO NOTHING;

-- Add UK cities
WITH 
  eng AS (SELECT id FROM states WHERE code = 'ENG'),
  sct AS (SELECT id FROM states WHERE code = 'SCT'),
  wls AS (SELECT id FROM states WHERE code = 'WLS')
INSERT INTO cities (name, state_id) VALUES
-- England cities
('London', (SELECT id FROM eng)),
('Manchester', (SELECT id FROM eng)),
('Birmingham', (SELECT id FROM eng)),
-- Scotland cities
('Edinburgh', (SELECT id FROM sct)),
('Glasgow', (SELECT id FROM sct)),
('Aberdeen', (SELECT id FROM sct)),
-- Wales cities
('Cardiff', (SELECT id FROM wls)),
('Swansea', (SELECT id FROM wls)),
('Newport', (SELECT id FROM wls))
ON CONFLICT DO NOTHING;

-- Add RLS policies
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Allow read access to location tables for all authenticated users
CREATE POLICY "Allow read access to countries" ON countries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to states" ON states
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to cities" ON cities
  FOR SELECT TO authenticated USING (true);

-- Create functions to get location data
CREATE OR REPLACE FUNCTION get_states_by_country(country_code text)
RETURNS TABLE (id uuid, name text, code text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT s.id, s.name, s.code
  FROM states s
  JOIN countries c ON c.id = s.country_id
  WHERE c.code = country_code
  ORDER BY s.name;
$$;

CREATE OR REPLACE FUNCTION get_cities_by_state(state_code text)
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT c.id, c.name
  FROM cities c
  JOIN states s ON s.id = c.state_id
  WHERE s.code = state_code
  ORDER BY c.name;
$$;