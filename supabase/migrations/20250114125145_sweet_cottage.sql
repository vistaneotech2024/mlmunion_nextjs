-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_countries_code;
DROP INDEX IF EXISTS idx_states_country_id;
DROP INDEX IF EXISTS idx_states_code;
DROP INDEX IF EXISTS idx_cities_state_id;

-- Create new indexes with unique names
CREATE INDEX IF NOT EXISTS idx_countries_code_v2 ON countries(code);
CREATE INDEX IF NOT EXISTS idx_states_country_id_v2 ON states(country_id);
CREATE INDEX IF NOT EXISTS idx_states_code_v2 ON states(code);
CREATE INDEX IF NOT EXISTS idx_cities_state_id_v2 ON cities(state_id);

-- Ensure countries table has required data
INSERT INTO countries (name, code) VALUES
('India', 'IN'),
('United States', 'US'),
('United Kingdom', 'GB')
ON CONFLICT (code) DO NOTHING;

-- Ensure states table has data for India
WITH country AS (SELECT id FROM countries WHERE code = 'IN')
INSERT INTO states (name, code, country_id) VALUES
('Delhi', 'DL', (SELECT id FROM country)),
('Maharashtra', 'MH', (SELECT id FROM country)),
('Karnataka', 'KA', (SELECT id FROM country)),
('Tamil Nadu', 'TN', (SELECT id FROM country)),
('Uttar Pradesh', 'UP', (SELECT id FROM country))
ON CONFLICT DO NOTHING;

-- Ensure cities table has data for Delhi
WITH state AS (SELECT id FROM states WHERE code = 'DL')
INSERT INTO cities (name, state_id) VALUES
('New Delhi', (SELECT id FROM state)),
('North Delhi', (SELECT id FROM state)),
('South Delhi', (SELECT id FROM state)),
('East Delhi', (SELECT id FROM state)),
('West Delhi', (SELECT id FROM state))
ON CONFLICT DO NOTHING;

-- Update functions to be more robust
CREATE OR REPLACE FUNCTION get_states_by_country(country_code text)
RETURNS TABLE (id uuid, name text, code text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
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
SET search_path = public
AS $$
  SELECT c.id, c.name
  FROM cities c
  JOIN states s ON s.id = c.state_id
  WHERE s.code = state_code
  ORDER BY c.name;
$$;