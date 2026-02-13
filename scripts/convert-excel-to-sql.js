import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Excel file
const excelPath = path.join(__dirname, '..', 'Countires_State_Cities_Full_data.xlsx');
const workbook = XLSX.readFile(excelPath);

// Get sheet names
const sheetNames = workbook.SheetNames;
console.log('Found sheets:', sheetNames);

// Helper function to escape SQL strings
function escapeSQL(str) {
  if (str === null || str === undefined || str === '') {
    return 'NULL';
  }
  if (typeof str === 'number' || typeof str === 'boolean') {
    return str;
  }
  // Escape single quotes and wrap in quotes
  return `'${String(str).replace(/'/g, "''")}'`;
}

// Helper function to convert value to SQL format
function toSQLValue(value, columnType = 'text') {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }
  
  if (columnType === 'integer' || columnType === 'bigint') {
    return value ? parseInt(value) : 'NULL';
  }
  
  if (columnType === 'numeric' || columnType === 'double precision') {
    return value ? parseFloat(value) : 'NULL';
  }
  
  if (columnType === 'boolean') {
    return value === true || value === 'true' || value === 1 || value === '1' ? 'true' : 'false';
  }
  
  if (columnType === 'jsonb' || columnType === 'json') {
    return escapeSQL(JSON.stringify(value));
  }
  
  return escapeSQL(value);
}

// Process Countries sheet
function processCountries() {
  const sheet = workbook.Sheets['Countries'];
  if (!sheet) {
    console.log('Countries sheet not found');
    return '';
  }
  
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`Processing ${data.length} countries...`);
  
  let sql = `-- Create CountriesV2 table
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

-- Insert Countries data
INSERT INTO countries_v2 (
  id, name, iso3, iso2, numeric_code, phone_code, capital, currency, 
  currency_name, currency_symbol, tld, native, region, region_id, 
  subregion, subregion_id, nationality, timezones, latitude, longitude, 
  emoji, emoji_u
) VALUES
`;

  const values = data.map((row, index) => {
    const vals = [
      toSQLValue(row.id, 'integer'),
      toSQLValue(row.name),
      toSQLValue(row.iso3),
      toSQLValue(row.iso2),
      toSQLValue(row.numeric_code, 'integer'),
      toSQLValue(row.phone_code),
      toSQLValue(row.capital),
      toSQLValue(row.currency),
      toSQLValue(row.currency_name),
      toSQLValue(row.currency_symbol),
      toSQLValue(row.tld),
      toSQLValue(row.native),
      toSQLValue(row.region),
      toSQLValue(row.region_id, 'integer'),
      toSQLValue(row.subregion),
      toSQLValue(row.subregion_id, 'integer'),
      toSQLValue(row.nationality),
      toSQLValue(row.timezones, 'jsonb'),
      toSQLValue(row.latitude, 'double precision'),
      toSQLValue(row.longitude, 'double precision'),
      toSQLValue(row.emoji),
      toSQLValue(row.emoji_u)
    ];
    return `(${vals.join(', ')})`;
  });

  sql += values.join(',\n') + ';\n\n';
  
  return sql;
}

// Process States sheet
function processStates() {
  const sheet = workbook.Sheets['States'];
  if (!sheet) {
    console.log('States sheet not found');
    return '';
  }
  
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`Processing ${data.length} states...`);
  
  let sql = `-- Create StatesV2 table
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

CREATE INDEX IF NOT EXISTS idx_states_v2_country_id ON states_v2(country_id);
CREATE INDEX IF NOT EXISTS idx_states_v2_country_code ON states_v2(country_code);
CREATE INDEX IF NOT EXISTS idx_states_v2_state_code ON states_v2(state_code);

-- Insert States data
INSERT INTO states_v2 (
  id, name, country_id, country_code, country_name, state_code, type, 
  latitude, longitude
) VALUES
`;

  const values = data.map((row) => {
    const vals = [
      toSQLValue(row.id, 'integer'),
      toSQLValue(row.name),
      toSQLValue(row.country_id, 'integer'),
      toSQLValue(row.country_code),
      toSQLValue(row.country_name),
      toSQLValue(row.state_code),
      toSQLValue(row.type),
      toSQLValue(row.latitude, 'double precision'),
      toSQLValue(row.longitude, 'double precision')
    ];
    return `(${vals.join(', ')})`;
  });

  sql += values.join(',\n') + ';\n\n';
  
  return sql;
}

// Process Cities sheet
function processCities() {
  const sheet = workbook.Sheets['cities'];
  if (!sheet) {
    console.log('Cities sheet not found');
    return '';
  }
  
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`Processing ${data.length} cities...`);
  
  let sql = `-- Create CitiesV2 table
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

CREATE INDEX IF NOT EXISTS idx_cities_v2_state_id ON cities_v2(state_id);
CREATE INDEX IF NOT EXISTS idx_cities_v2_country_id ON cities_v2(country_id);
CREATE INDEX IF NOT EXISTS idx_cities_v2_state_code ON cities_v2(state_code);
CREATE INDEX IF NOT EXISTS idx_cities_v2_country_code ON cities_v2(country_code);

-- Insert Cities data
INSERT INTO cities_v2 (
  id, name, state_id, state_code, state_name, country_id, country_code, 
  country_name, latitude, longitude, wiki_data_id
) VALUES
`;

  // Process in batches to avoid huge SQL files
  const batchSize = 1000;
  const batches = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const values = batch.map((row) => {
      const vals = [
        toSQLValue(row.id, 'integer'),
        toSQLValue(row.name),
        toSQLValue(row.state_id, 'integer'),
        toSQLValue(row.state_code),
        toSQLValue(row.state_name),
        toSQLValue(row.country_id, 'integer'),
        toSQLValue(row.country_code),
        toSQLValue(row.country_name),
        toSQLValue(row.latitude, 'double precision'),
        toSQLValue(row.longitude, 'double precision'),
        toSQLValue(row.wikiDataId || row.wiki_data_id)
      ];
      return `(${vals.join(', ')})`;
    });
    batches.push(values.join(',\n'));
  }

  sql += batches.join(',\n') + ';\n\n';
  
  return sql;
}

// Generate migration file
function generateMigration() {
  console.log('Starting Excel to SQL conversion...\n');
  
  let migrationSQL = `/*
  # Import Countries, States, and Cities Data from Excel
  
  This migration creates three new tables (countries_v2, states_v2, cities_v2)
  and imports comprehensive location data from Excel file.
  
  Tables:
  - countries_v2: Complete country data with ISO codes, phone codes, currencies, etc.
  - states_v2: State/province data linked to countries
  - cities_v2: City data linked to states and countries
  
  Note: This migration uses INTEGER IDs from the Excel file as primary keys.
*/

`;

  // Process each sheet
  migrationSQL += processCountries();
  migrationSQL += processStates();
  migrationSQL += processCities();

  // Add RLS policies
  migrationSQL += `-- Enable Row Level Security
ALTER TABLE countries_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE states_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities_v2 ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to countries_v2" ON countries_v2
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to states_v2" ON states_v2
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to cities_v2" ON cities_v2
  FOR SELECT TO authenticated USING (true);

-- Create helper functions for querying
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
`;

  // Write to migration file
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '');
  const migrationFileName = `supabase/migrations/${timestamp}_import_countries_states_cities.sql`;
  const migrationPath = path.join(__dirname, '..', migrationFileName);
  
  fs.writeFileSync(migrationPath, migrationSQL, 'utf8');
  
  console.log(`\n✅ Migration file created: ${migrationFileName}`);
  console.log(`📊 File size: ${(fs.statSync(migrationPath).size / 1024 / 1024).toFixed(2)} MB`);
  console.log('\n📝 Next steps:');
  console.log('1. Review the migration file');
  console.log('2. Run it in Supabase Dashboard SQL Editor');
  console.log('3. Or use Supabase CLI: supabase db push');
}

// Run the conversion
try {
  generateMigration();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}






































