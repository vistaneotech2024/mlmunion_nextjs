import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', 'env') });

// Get Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 
                    process.env.SUPABASE_URL || 
                    process.env.NEXT_PUBLIC_SUPABASE_URL;
                    
let supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                  process.env.SUPABASE_SERVICE_ROLE_KEY ||
                  process.env.SUPABASE_SERVICE_KEY;

// Handle typo in variable name
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

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Error: Missing Supabase credentials!');
  console.error('\nExpected variables:');
  console.error('  - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('  - VITE_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env file and ensure these variables are set.');
  process.exit(1);
}

console.log('✅ Credentials found!\n');

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get value from row (case-insensitive)
function getRowValue(row, ...possibleKeys) {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
    // Try case-insensitive match
    const lowerKey = key.toLowerCase();
    for (const rowKey in row) {
      if (rowKey.toLowerCase() === lowerKey) {
        return row[rowKey];
      }
    }
  }
  return null;
}

// Helper function to clean and convert values
function cleanValue(value, type = 'text') {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  const trimmed = String(value).trim();
  
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
    return null;
  }
  
  if (type === 'integer') {
    const num = parseInt(trimmed);
    return isNaN(num) ? null : num;
  }
  
  if (type === 'url') {
    // Ensure URL has protocol
    if (trimmed && !trimmed.match(/^https?:\/\//i)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }
  
  return trimmed;
}

// Function to validate UUID format
function isValidUUID(uuid) {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(String(uuid).trim());
}

// Function to normalize website URL
function normalizeWebsite(website) {
  if (!website) return null;
  const cleaned = cleanValue(website);
  if (!cleaned) return null;
  
  // If it already has protocol, return as is
  if (cleaned.match(/^https?:\/\//i)) {
    return cleaned;
  }
  
  // Add https:// if missing
  return `https://${cleaned}`;
}

// Insert data in batches
async function insertBatch(data, batchSize = 100) {
  let inserted = 0;
  let skipped = 0;
  const total = data.length;
  let batchNum = 0;
  
  for (let i = 0; i < data.length; i += batchSize) {
    batchNum++;
    const batch = data.slice(i, i + batchSize);
    
    // Filter out invalid rows and clean data
    const cleanBatch = batch
      .map(row => {
        // Get name with case-insensitive lookup
        const nameValue = getRowValue(row, 'name', 'Name', 'NAME');
        const name = cleanValue(nameValue);
        
        // Skip rows with empty name (required field)
        if (!name || name.trim() === '') {
          skipped++;
          return null;
        }
        
        // Get other values with case-insensitive lookup
        const description = cleanValue(getRowValue(row, 'description', 'Description', 'DESCRIPTION')) || 'No description available.';
        const category = cleanValue(getRowValue(row, 'category', 'Category', 'CATEGORY')) || 'Health & Wellness';
        const country = cleanValue(getRowValue(row, 'country', 'Country', 'COUNTRY')) || 'IN';
        const headquarters = cleanValue(getRowValue(row, 'headquarters', 'Headquarters', 'HEADQUARTERS')) || name;
        const website = normalizeWebsite(getRowValue(row, 'website', 'Website', 'WEBSITE')) || 'https://example.com';
        const established = cleanValue(getRowValue(row, 'established', 'Established', 'ESTABLISHED'), 'integer') || 2016;
        const status = cleanValue(getRowValue(row, 'status', 'Status', 'STATUS')) || 'approved';
        const state = cleanValue(getRowValue(row, 'State', 'state', 'STATE')) || null;
        const city = cleanValue(getRowValue(row, 'City', 'city', 'CITY')) || null;
        const countryName = cleanValue(getRowValue(row, 'country_name', 'countryName', 'Country_Name', 'COUNTRY_NAME')) || 'india';
        
        // Set submitted_by to null - CSV UUIDs may not exist in profiles table
        // This avoids foreign key constraint violations
        const submittedBy = null;
        
        // Build the insert object
        // Note: id is auto-generated by database (UUID), so we don't include it
        // Note: slug is auto-generated by trigger from name, so we set it to null
        const insertRow = {
          name: name,
          description: description,
          category: category,
          country: country,
          headquarters: headquarters,
          website: website,
          established: established,
          logo_url: 'https://via.placeholder.com/200x200?text=Logo', // Default logo URL
          status: status,
          state: state,
          city: city,
          country_name: countryName,
          submitted_by: null, // Set to null to avoid foreign key constraint violations (CSV UUIDs may not exist in profiles table)
          slug: null // Auto-generated by trigger from name
        };
        
        return insertRow;
      })
      .filter(row => row !== null); // Remove skipped rows
    
    if (cleanBatch.length === 0) {
      continue;
    }
    
    try {
      const { data: insertedData, error } = await supabase
        .from('mlm_companies')
        .insert(cleanBatch, { returning: 'minimal' });
      
      if (error) {
        console.error(`\n❌ Error inserting batch ${batchNum}:`);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        
        // Try individual inserts to identify problematic rows
        if (batch.length > 1) {
          console.log(`   Trying individual inserts for batch ${batchNum}...`);
          for (const row of cleanBatch) {
            const { error: singleError } = await supabase
              .from('mlm_companies')
              .insert(row, { returning: 'minimal' });
            
            if (!singleError) {
              inserted++;
            } else {
              console.error(`   Failed to insert: ${row.name}`);
              console.error(`   Error: ${singleError.message}`);
              skipped++;
            }
          }
        }
      } else {
        inserted += cleanBatch.length;
      }
    } catch (error) {
      console.error(`\n❌ Exception in batch ${batchNum}:`, error.message);
      skipped += cleanBatch.length;
    }
    
    const progress = ((inserted / total) * 100).toFixed(1);
    process.stdout.write(`\r📊 Progress: ${inserted}/${total} inserted (${progress}%), ${skipped} skipped`);
    
    // Small delay to avoid rate limiting
    if (i + batchSize < data.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log(`\n✅ Import completed!`);
  console.log(`   - Inserted: ${inserted} records`);
  console.log(`   - Skipped: ${skipped} records`);
  return inserted;
}

// Main function
async function main() {
  console.log('🚀 Starting CSV to MLM Companies import...\n');
  console.log('⚠️  Note: This requires SERVICE_ROLE_KEY for direct inserts\n');
  
  try {
    // Read CSV file
    const csvPath = path.join(__dirname, '..', 'mlm_sheet - Formatted_Master_List - mlm_sheet - Formatted_Master_List.csv.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found: ${csvPath}`);
      process.exit(1);
    }
    
    console.log(`📂 Reading CSV file: ${csvPath}\n`);
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Normalize header names
        return header.trim();
      }
    });
    
    if (parseResult.errors.length > 0) {
      console.warn('⚠️  CSV parsing warnings:');
      parseResult.errors.forEach(error => {
        console.warn(`   - ${error.message} (row ${error.row})`);
      });
      console.log('');
    }
    
    const data = parseResult.data;
    console.log(`📥 Found ${data.length} rows in CSV\n`);
    
    // Filter out rows with empty names
    const validData = data.filter(row => {
      const nameValue = getRowValue(row, 'name', 'Name', 'NAME');
      return nameValue && String(nameValue).trim() !== '';
    });
    
    console.log(`✅ ${validData.length} rows with valid names (${data.length - validData.length} rows skipped)\n`);
    
    if (validData.length === 0) {
      console.error('❌ No valid data to import!');
      process.exit(1);
    }
    
    // Import data
    console.log('📥 Step 2: Importing data...\n');
    await insertBatch(validData, 100);
    
    console.log('\n✅ Import completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Check count with: SELECT COUNT(*) FROM mlm_companies;');
    console.log('  - Slugs were auto-generated by trigger');
    console.log('  - IDs were auto-generated as UUIDs');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

main();

