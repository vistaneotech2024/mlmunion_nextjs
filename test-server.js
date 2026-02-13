// Test script to verify server.js can run
// Run this on your server: node test-server.js

console.log('=== Server Environment Test ===\n');

// Check Node.js version
console.log('1. Node.js Version:');
console.log('   ', process.version);
console.log('');

// Check environment variables
console.log('2. Environment Variables:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET');
console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET');
console.log('   PORT:', process.env.PORT || 'NOT SET');
console.log('');

// Check if Next.js is installed
console.log('3. Checking Next.js installation:');
try {
  const next = require('next');
  console.log('   ✅ Next.js is installed');
  console.log('   Version:', require('next/package.json').version);
} catch (err) {
  console.log('   ❌ Next.js is NOT installed');
  console.log('   Error:', err.message);
}
console.log('');

// Check if .next folder exists
console.log('4. Checking build output:');
const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '.next');
if (fs.existsSync(nextDir)) {
  console.log('   ✅ .next folder exists');
  
  const serverDir = path.join(nextDir, 'server');
  const staticDir = path.join(nextDir, 'static');
  
  if (fs.existsSync(serverDir)) {
    console.log('   ✅ .next/server exists');
  } else {
    console.log('   ❌ .next/server MISSING');
  }
  
  if (fs.existsSync(staticDir)) {
    console.log('   ✅ .next/static exists');
  } else {
    console.log('   ❌ .next/static MISSING');
  }
} else {
  console.log('   ❌ .next folder MISSING');
  console.log('   You need to run: npm run build');
}
console.log('');

// Check if server.js exists
console.log('5. Checking server.js:');
const serverJs = path.join(__dirname, 'server.js');
if (fs.existsSync(serverJs)) {
  console.log('   ✅ server.js exists');
} else {
  console.log('   ❌ server.js MISSING');
}
console.log('');

// Check if web.config exists
console.log('6. Checking web.config:');
const webConfig = path.join(__dirname, 'web.config');
if (fs.existsSync(webConfig)) {
  console.log('   ✅ web.config exists');
} else {
  console.log('   ❌ web.config MISSING');
}
console.log('');

console.log('=== Test Complete ===');
console.log('\nIf Next.js is not installed, run: npm install --production');
console.log('If .next folder is missing, rebuild locally and re-upload');
