#!/usr/bin/env node

/**
 * Quick Setup Script
 * Creates necessary directories and copies .env.example
 */

const fs = require('fs');
const path = require('path');

console.log('🚕 Taxi Dispatch System - Setup\n');

// Create directories
const dirsToCreate = [
    './logs',
    './uploads',
    './uploads/evidence'
];

dirsToCreate.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✓ Created directory: ${dir}`);
    } else {
        console.log(`✓ Directory exists: ${dir}`);
    }
});

// Copy .env.example to .env if not exists
if (!fs.existsSync('.env')) {
    fs.copyFileSync('.env.example', '.env');
    console.log('✓ Created .env from .env.example');
    console.log('\n⚠️  IMPORTANT: Edit .env and update the following:');
    console.log('   - Database credentials (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD)');
    console.log('   - JWT secrets (JWT_SECRET, JWT_REFRESH_SECRET)');
    console.log('   - Redis connection (if not localhost)');
    console.log('   - Google Maps API key (GOOGLE_MAPS_API_KEY)');
    console.log('   - SMS service credentials (TWILIO_*)');
} else {
    console.log('✓ .env file already exists');
}

console.log('\n📋 Next steps:');
console.log('   1. Edit .env with your configuration');
console.log('   2. Create PostgreSQL database: createdb taxi_dispatch');
console.log('   3. Run migrations: psql -d taxi_dispatch -f ../database/schema.sql');
console.log('   4. Run state machine setup: psql -d taxi_dispatch -f ../database/state-machine.sql');
console.log('   5. Install dependencies: npm install');
console.log('   6. Start development server: npm run dev');
console.log('\n✅ Setup complete!\n');
