const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env
const envPath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('\x1b[31m%s\x1b[0m', '❌ ERROR: Could not load .env file.');
  console.error('Please create a .env file in the backend directory.');
  process.exit(1);
}

const required = ['DB_PASSWORD', 'DB_USER', 'JWT_SECRET'];
const missing = [];

required.forEach(key => {
  if (!process.env[key] || process.env[key].trim() === '') {
    missing.push(key);
  }
});

if (missing.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', '❌ CRITICAL CONFIG ERROR: Missing Config Variables');
  console.error('The following environment variables are missing or empty in backend/.env:');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('\nPlease open backend/.env and set these values.');
  if (missing.includes('DB_PASSWORD')) {
    console.error('\x1b[33m%s\x1b[0m', '💡 TIP: DB_PASSWORD should be your PostgreSQL password.');
  }
  process.exit(1);
}

console.log('\x1b[32m%s\x1b[0m', '✅ Environment config looks good.');
