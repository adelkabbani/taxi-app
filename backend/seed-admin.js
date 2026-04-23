require('dotenv').config();
const db = require('./config/database');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  try {
    console.log('Restoring Super Admin...');

    const email = 'admin@taxi.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Added 'phone' to satisfy the not-null constraint
    const result = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, tenant_id, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [email, hashedPassword, 'admin', 'System', 'Admin', null, '+491701111111']
    );

    console.log(`✓ Admin restored (ID: ${result.rows[0].id})`);
    console.log(`Credentials -> Email: ${email}, Password: ${password}`);
    console.log('--- Admin Restoration Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('Failed to restore Admin:', err.message);
    process.exit(1);
  }
}

seedAdmin();
