import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (try multiple .env file locations)
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', 'env') });

// Support multiple variable name patterns
const supabaseUrl = process.env.VITE_SUPABASE_URL || 
                    process.env.SUPABASE_URL || 
                    process.env.NEXT_PUBLIC_SUPABASE_URL;
                    
// Try to find SERVICE_ROLE_KEY with various name patterns (including typos)
let supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                  process.env.SUPABASE_SERVICE_ROLE_KEY ||
                  process.env.SUPABASE_SERVICE_KEY;

// Handle typo in variable name (missing 'Y')
if (!supabaseKey) {
  const serviceKeyVar = Object.keys(process.env).find(key => 
    key.includes('SERVICE') && 
    (key.includes('ROLE') || key.includes('ROLE_KE')) &&
    (key.includes('KEY') || key.endsWith('KE'))
  );
  if (serviceKeyVar) {
    supabaseKey = process.env[serviceKeyVar];
  }
}

// Direct check for the typo version
if (!supabaseKey && process.env.VITE_SUPABASE_SERVICE_ROLE_KE) {
  supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KE;
}

// Debug: Show what env vars are available
console.log('\n🔍 Checking environment variables...');
console.log('Available SUPABASE variables:');
Object.keys(process.env)
  .filter(key => key.includes('SUPABASE') || key.includes('supabase'))
  .forEach(key => console.log(`  - ${key}: ${key.includes('KEY') ? '***' : process.env[key]}`));

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Error: Missing Supabase credentials!');
  console.error('\nExpected variables:');
  console.error('  - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('  - VITE_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env file and ensure these variables are set.');
  console.error('\nYou can find these in Supabase Dashboard:');
  console.error('- Settings → API → Project URL');
  console.error('- Settings → API → service_role key (secret)');
  process.exit(1);
}

console.log('✅ Credentials found!\n');

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to clean and convert values
function cleanValue(value, type = 'text') {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  if (type === 'integer') {
    const num = parseInt(value);
    return isNaN(num) ? null : num;
  }
  
  if (type === 'double') {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
  
  if (type === 'boolean') {
    return value === true || value === 'true' || value === 1 || value === '1';
  }
  
  if (type === 'jsonb') {
    try {
      if (typeof value === 'string') {
        return JSON.parse(value);
      }
      return value;
    } catch {
      return null;
    }
  }
  
  return String(value).trim() || null;
}

// Create tables using direct SQL execution via REST API
async function createTables() {
  console.log('📋 Creating tables...\n');
  
  // Use the REST API to execute SQL directly
  const createTablesSQL = `
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

CREATE INDEX IF NOT EXISTS idx_cities_v2_state_id ON cities_v2(state_id);
CREATE INDEX IF NOT EXISTS idx_cities_v2_country_id ON cities_v2(country_id);
CREATE INDEX IF NOT EXISTS idx_cities_v2_state_code ON cities_v2(state_code);
CREATE INDEX IF NOT EXISTS idx_cities_v2_country_code ON cities_v2(country_code);

-- Enable RLS
ALTER TABLE countries_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE states_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow read access to countries_v2" ON countries_v2;
CREATE POLICY "Allow read access to countries_v2" ON countries_v2
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read access to states_v2" ON states_v2;
CREATE POLICY "Allow read access to states_v2" ON states_v2
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read access to cities_v2" ON cities_v2;
CREATE POLICY "Allow read access to cities_v2" ON cities_v2
  FOR SELECT TO authenticated USING (true);
`;

  // Execute SQL via REST API
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query: createTablesSQL })
    });

    if (!response.ok) {
      // Try alternative: Use PostgREST to check if tables exist, if not, suggest manual creation
      console.log('⚠️  Could not create tables via API. Checking if tables exist...');
      
      // Check if tables exist by trying to query them
      const { error: checkError } = await supabase.from('countries_v2').select('id').limit(1);
      if (checkError && checkError.code === '42P01') {
        console.log('❌ Tables do not exist. Please create them first using the SQL migration file.');
        console.log('   File: supabase/migrations/20251222114848_import_countries_states_cities.sql');
        console.log('   Or run the CREATE TABLE statements in Supabase Dashboard SQL Editor.');
        throw new Error('Tables must be created first');
      }
      console.log('✅ Tables already exist or were created successfully');
    } else {
      console.log('✅ Tables created successfully');
    }
  } catch (error) {
    // If exec_sql doesn't exist, tables need to be created manually
    console.log('⚠️  Note: Tables need to be created manually.');
    console.log('   Please run the CREATE TABLE statements from the migration file');
    console.log('   in Supabase Dashboard → SQL Editor');
    console.log('   Or the tables may already exist.\n');
  }
}

// Insert data in batches
async function insertBatch(table, data, batchSize = 500) {
  let inserted = 0;
  const total = data.length;
  let batchNum = 0;
  
  for (let i = 0; i < data.length; i += batchSize) {
    batchNum++;
    const batch = data.slice(i, i + batchSize);
    
    // Filter out null values and clean data
    const cleanBatch = batch.map(row => {
      const cleanRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (value !== null && value !== undefined && value !== '') {
          cleanRow[key] = value;
        }
      }
      return cleanRow;
    }).filter(row => Object.keys(row).length > 0);
    
    if (cleanBatch.length === 0) {
      continue;
    }
    
    const { data: insertedData, error } = await supabase
      .from(table)
      .insert(cleanBatch, { returning: 'minimal' });
    
    if (error) {
      console.error(`\n❌ Error inserting batch ${batchNum}:`);
      console.error('Error object:', JSON.stringify(error, null, 2));
      console.error('Error message:', error.message || 'No message');
      console.error('Error code:', error.code || 'No code');
      console.error('Error details:', error.details || 'No details');
      console.error('Error hint:', error.hint || 'No hint');
      console.error('Sample data (first row):', JSON.stringify(cleanBatch[0], null, 2));
      
      // Try smaller batches if error
      if (batch.length > 100) {
        console.log(`   Retrying with smaller batches...`);
        const smallerBatchSize = Math.floor(batchSize / 2);
        const retryInserted = await insertBatch(table, batch, smallerBatchSize);
        inserted += retryInserted;
      } else {
        // Try individual inserts for this batch
        console.log(`   Trying individual inserts...`);
        for (const row of cleanBatch.slice(0, 10)) { // Limit to first 10 to avoid too many errors
          const { error: singleError } = await supabase
            .from(table)
            .insert(row, { returning: 'minimal' });
          if (!singleError) inserted++;
          if (singleError && batchNum === 1) {
            console.error(`   Sample error:`, JSON.stringify(singleError, null, 2));
            console.error(`   Problematic row:`, JSON.stringify(row, null, 2));
            break; // Stop after first error to avoid spam
          }
        }
      }
    } else {
      inserted += cleanBatch.length;
    }
    
    const progress = ((inserted / total) * 100).toFixed(1);
    process.stdout.write(`\r📊 ${table}: ${inserted}/${total} (${progress}%)`);
    
    // Small delay to avoid rate limiting
    if (i + batchSize < data.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\n✅ ${table}: ${inserted} records inserted\n`);
  return inserted;
}

// Process Countries
async function processCountries() {
  const excelPath = path.join(__dirname, '..', 'Countires_State_Cities_Full_data.xlsx');
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['Countries'];
  
  if (!sheet) {
    console.log('❌ Countries sheet not found');
    return;
  }
  
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`📥 Processing ${data.length} countries...`);
  
  const countries = data.map(row => ({
    id: cleanValue(row.id, 'integer'),
    name: cleanValue(row.name),
    iso3: cleanValue(row.iso3),
    iso2: cleanValue(row.iso2),
    numeric_code: cleanValue(row.numeric_code, 'integer'),
    phone_code: cleanValue(row.phone_code),
    capital: cleanValue(row.capital),
    currency: cleanValue(row.currency),
    currency_name: cleanValue(row.currency_name),
    currency_symbol: cleanValue(row.currency_symbol),
    tld: cleanValue(row.tld),
    native: cleanValue(row.native),
    region: cleanValue(row.region),
    region_id: cleanValue(row.region_id, 'integer'),
    subregion: cleanValue(row.subregion),
    subregion_id: cleanValue(row.subregion_id, 'integer'),
    nationality: cleanValue(row.nationality),
    timezones: cleanValue(row.timezones, 'jsonb'),
    latitude: cleanValue(row.latitude, 'double'),
    longitude: cleanValue(row.longitude, 'double'),
    emoji: cleanValue(row.emoji),
    emoji_u: cleanValue(row.emoji_u)
  }));
  
  await insertBatch('countries_v2', countries, 500);
}

// Process States
async function processStates() {
  const excelPath = path.join(__dirname, '..', 'Countires_State_Cities_Full_data.xlsx');
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['States'];
  
  if (!sheet) {
    console.log('❌ States sheet not found');
    return;
  }
  
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`📥 Processing ${data.length} states...`);
  
  const states = data.map(row => ({
    id: cleanValue(row.id, 'integer'),
    name: cleanValue(row.name),
    country_id: cleanValue(row.country_id, 'integer'),
    country_code: cleanValue(row.country_code),
    country_name: cleanValue(row.country_name),
    state_code: cleanValue(row.state_code),
    type: cleanValue(row.type),
    latitude: cleanValue(row.latitude, 'double'),
    longitude: cleanValue(row.longitude, 'double')
  }));
  
  await insertBatch('states_v2', states, 500);
}

// Process Cities
async function processCities() {
  const excelPath = path.join(__dirname, '..', 'Countires_State_Cities_Full_data.xlsx');
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['cities'];
  
  if (!sheet) {
    console.log('❌ Cities sheet not found');
    return;
  }
  
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`📥 Processing ${data.length} cities...`);
  
  const cities = data.map(row => ({
    id: cleanValue(row.id, 'integer'),
    name: cleanValue(row.name),
    state_id: cleanValue(row.state_id, 'integer'),
    state_code: cleanValue(row.state_code),
    state_name: cleanValue(row.state_name),
    country_id: cleanValue(row.country_id, 'integer'),
    country_code: cleanValue(row.country_code),
    country_name: cleanValue(row.country_name),
    latitude: cleanValue(row.latitude, 'double'),
    longitude: cleanValue(row.longitude, 'double'),
    wiki_data_id: cleanValue(row.wikiDataId || row.wiki_data_id)
  }));
  
  await insertBatch('cities_v2', cities, 500);
}

// Check if tables exist
async function checkTablesExist() {
  const { error: countriesError } = await supabase.from('countries_v2').select('id').limit(1);
  const { error: statesError } = await supabase.from('states_v2').select('id').limit(1);
  const { error: citiesError } = await supabase.from('cities_v2').select('id').limit(1);
  
  return {
    countries: !countriesError || countriesError.code !== '42P01',
    states: !statesError || statesError.code !== '42P01',
    cities: !citiesError || citiesError.code !== '42P01'
  };
}

// Main function
async function main() {
  console.log('🚀 Starting Excel to Supabase import...\n');
  console.log('⚠️  Note: This requires SERVICE_ROLE_KEY for direct inserts\n');
  
  try {
    // Check if tables exist
    console.log('📋 Step 1: Checking if tables exist...\n');
    const tablesExist = await checkTablesExist();
    
    if (!tablesExist.countries || !tablesExist.states || !tablesExist.cities) {
      console.log('❌ Tables do not exist yet!');
      console.log('\n📝 Please run the CREATE TABLE statements first:');
      console.log('   1. Open Supabase Dashboard → SQL Editor');
      console.log('   2. Run the SQL from: scripts/create-tables-first.sql');
      console.log('   3. Then run this import script again\n');
      process.exit(1);
    }
    
    console.log('✅ Tables exist, proceeding with import...\n');
    
    // Import data
    console.log('📥 Step 2: Importing data...\n');
    await processCountries();
    await processStates();
    await processCities();
    
    console.log('\n✅ Import completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Countries: Check count with: SELECT COUNT(*) FROM countries_v2;');
    console.log('  - States: Check count with: SELECT COUNT(*) FROM states_v2;');
    console.log('  - Cities: Check count with: SELECT COUNT(*) FROM cities_v2;');
  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

main();

