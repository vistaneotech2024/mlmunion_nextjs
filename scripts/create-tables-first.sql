-- Create CountriesV2, StatesV2, and CitiesV2 tables
-- Run this FIRST in Supabase Dashboard SQL Editor before importing data

-- Create CountriesV2 table
CREATE TABLE IF NOT EXISTS countries_v2 (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  iso3 TEXT,
  iso2 TEXT,
  numeric_code INTEGER,
  phone_code TEXT,
  capital TEXT,
  currency TEXT,
  currency_name TEXT,
  currency_symbol TEXT,
  tld TEXT,
  native TEXT,
  region TEXT,
  region_id INTEGER,
  subregion TEXT,
  subregion_id INTEGER,
  nationality TEXT,
  timezones JSONB,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  emoji TEXT,
  emoji_u TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create StatesV2 table
CREATE TABLE IF NOT EXISTS states_v2 (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country_id INTEGER REFERENCES countries_v2(id) ON DELETE CASCADE,
  country_code TEXT,
  country_name TEXT,
  state_code TEXT,
  type TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for states_v2
CREATE INDEX IF NOT EXISTS idx_states_v2_country_id ON states_v2(country_id);
CREATE INDEX IF NOT EXISTS idx_states_v2_country_code ON states_v2(country_code);
CREATE INDEX IF NOT EXISTS idx_states_v2_state_code ON states_v2(state_code);

-- Create CitiesV2 table
CREATE TABLE IF NOT EXISTS cities_v2 (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  state_id INTEGER REFERENCES states_v2(id) ON DELETE CASCADE,
  state_code TEXT,
  state_name TEXT,
  country_id INTEGER REFERENCES countries_v2(id) ON DELETE CASCADE,
  country_code TEXT,
  country_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  wiki_data_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for cities_v2
CREATE INDEX IF NOT EXISTS idx_cities_v2_state_id ON cities_v2(state_id);
CREATE INDEX IF NOT EXISTS idx_cities_v2_country_id ON cities_v2(country_id);
CREATE INDEX IF NOT EXISTS idx_cities_v2_state_code ON cities_v2(state_code);
CREATE INDEX IF NOT EXISTS idx_cities_v2_country_code ON cities_v2(country_code);

-- Enable RLS but allow service role to insert
ALTER TABLE countries_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE states_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities_v2 ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow read access to countries_v2" ON countries_v2;
DROP POLICY IF EXISTS "Allow read access to states_v2" ON states_v2;
DROP POLICY IF EXISTS "Allow read access to cities_v2" ON cities_v2;
DROP POLICY IF EXISTS "Service role can insert countries_v2" ON countries_v2;
DROP POLICY IF EXISTS "Service role can insert states_v2" ON states_v2;
DROP POLICY IF EXISTS "Service role can insert cities_v2" ON cities_v2;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to countries_v2" ON countries_v2
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to states_v2" ON states_v2
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to cities_v2" ON cities_v2
  FOR SELECT TO authenticated USING (true);

-- Allow service role to insert (for import script)
CREATE POLICY "Service role can insert countries_v2" ON countries_v2
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can insert states_v2" ON states_v2
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can insert cities_v2" ON cities_v2
  FOR INSERT TO service_role WITH CHECK (true);






































