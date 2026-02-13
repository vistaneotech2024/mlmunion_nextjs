import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find the migration file
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir);
const migrationFile = files.find(f => f.includes('import_countries_states_cities'));

if (!migrationFile) {
  console.error('❌ Migration file not found!');
  console.log('Run: npm run convert-excel first');
  process.exit(1);
}

const filePath = path.join(migrationsDir, migrationFile);
const content = fs.readFileSync(filePath, 'utf8');

console.log(`📄 Splitting migration file: ${migrationFile}`);
console.log(`📊 File size: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB\n`);

// Split into sections
const sections = {
  header: content.match(/^[\s\S]*?-- Create CountriesV2 table/)?.[0] || '',
  countries: content.match(/-- Create CountriesV2 table[\s\S]*?-- Create StatesV2 table/)?.[0] || '',
  states: content.match(/-- Create StatesV2 table[\s\S]*?-- Create CitiesV2 table/)?.[0] || '',
  cities: content.match(/-- Create CitiesV2 table[\s\S]*$/)?.[0] || ''
};

// Extract INSERT statements
const countriesInsert = sections.countries.match(/INSERT INTO countries_v2[\s\S]*?;/)?.[0] || '';
const statesInsert = sections.states.match(/INSERT INTO states_v2[\s\S]*?;/)?.[0] || '';
const citiesInsert = sections.cities.match(/INSERT INTO cities_v2[\s\S]*?;/)?.[0] || '';

// Split cities into chunks (each ~2MB)
const citiesChunks = [];
const chunkSize = 50000; // characters per chunk
let currentChunk = '';
let chunkNum = 1;

const citiesLines = citiesInsert.split('\n');
let currentLines = [];

for (const line of citiesLines) {
  currentLines.push(line);
  currentChunk += line + '\n';
  
  if (currentChunk.length > chunkSize && line.includes('),')) {
    // End of a value tuple, good place to split
    citiesChunks.push({
      num: chunkNum++,
      content: currentChunk.trim().replace(/,$/, ';')
    });
    currentChunk = '';
    currentLines = [];
  }
}

if (currentChunk) {
  citiesChunks.push({
    num: chunkNum,
    content: currentChunk.trim().replace(/,$/, ';')
  });
}

// Write split files
const baseName = migrationFile.replace('.sql', '');

// Part 1: Create tables + Countries
const part1 = sections.header + '\n' + countriesInsert;
fs.writeFileSync(
  path.join(migrationsDir, `${baseName}_part1_tables_countries.sql`),
  part1,
  'utf8'
);
console.log(`✅ Created: ${baseName}_part1_tables_countries.sql`);

// Part 2: States
const part2 = sections.states.replace(/INSERT INTO states_v2[\s\S]*?;/, statesInsert);
fs.writeFileSync(
  path.join(migrationsDir, `${baseName}_part2_states.sql`),
  part2,
  'utf8'
);
console.log(`✅ Created: ${baseName}_part2_states.sql`);

// Part 3-N: Cities (split into chunks)
citiesChunks.forEach((chunk, index) => {
  const partNum = index + 3;
  const partContent = index === 0 
    ? sections.cities.replace(/INSERT INTO cities_v2[\s\S]*?;/, chunk.content)
    : `-- Cities Part ${chunk.num}\nINSERT INTO cities_v2 (id, name, state_id, state_code, state_name, country_id, country_code, country_name, latitude, longitude, wiki_data_id) VALUES\n${chunk.content}`;
  
  fs.writeFileSync(
    path.join(migrationsDir, `${baseName}_part${partNum}_cities_chunk${chunk.num}.sql`),
    partContent,
    'utf8'
  );
  console.log(`✅ Created: ${baseName}_part${partNum}_cities_chunk${chunk.num}.sql`);
});

// Add helper functions file
const helpers = content.match(/-- Create helper functions[\s\S]*$/)?.[0] || '';
if (helpers) {
  fs.writeFileSync(
    path.join(migrationsDir, `${baseName}_helpers.sql`),
    helpers,
    'utf8'
  );
  console.log(`✅ Created: ${baseName}_helpers.sql`);
}

console.log(`\n📝 Total files created: ${2 + citiesChunks.length + (helpers ? 1 : 0)}`);
console.log('\n📋 Execution order:');
console.log('1. Run part1_tables_countries.sql');
console.log('2. Run part2_states.sql');
citiesChunks.forEach((_, i) => {
  console.log(`${i + 3}. Run part${i + 3}_cities_chunk${i + 1}.sql`);
});
if (helpers) {
  console.log(`${citiesChunks.length + 3}. Run helpers.sql`);
}






































