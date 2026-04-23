const { Pool } = require('pg');
require('dotenv').config({ path: '../backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function listSchema() {
  try {
    console.log('--- TABLES ---');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    tables.rows.forEach(row => console.log(row.table_name));

    console.log('\n--- VIEWS ---');
    const views = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    views.rows.forEach(row => console.log(row.table_name));

    console.log('\n--- ENUM: booking_status ---');
    const enums = await pool.query(`
      SELECT e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'booking_status'
      ORDER BY e.enumsortorder
    `);
    enums.rows.forEach(row => console.log(row.enumlabel));

    // Check booking_timeline specifically
    const timeline = await pool.query(`
        SELECT definition FROM pg_views WHERE viewname = 'booking_timeline'
    `);
    if (timeline.rows.length > 0) {
        console.log('\n--- VIEW DEFINITION: booking_timeline ---');
        console.log(timeline.rows[0].definition);
    }

  } catch (err) {
    console.error('Error listing schema:', err);
  } finally {
    await pool.end();
  }
}

listSchema();
