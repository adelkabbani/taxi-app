require('dotenv').config();
const db = require('./config/database');

async function fixSchema() {
    console.log('🔧 Fixing Assignment Schema to match service code...');

    try {
        // 1. Fix assignment_attempts table
        console.log('   Updating assignment_attempts...');
        await db.query(`
            DROP TABLE IF EXISTS assignment_attempts CASCADE;
            CREATE TABLE assignment_attempts (
                id SERIAL PRIMARY KEY,
                booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
                driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
                assignment_method VARCHAR(50) DEFAULT 'auto',
                status VARCHAR(50) DEFAULT 'pending',
                rejection_reason TEXT,
                attempted_at TIMESTAMP DEFAULT NOW(),
                responded_at TIMESTAMP,
                is_current_assignment BOOLEAN DEFAULT true
            );
            CREATE INDEX idx_assignment_attempts_booking ON assignment_attempts(booking_id);
        `);

        // 2. Fix assignment_round_robin table
        console.log('   Updating assignment_round_robin...');
        await db.query(`
            DROP TABLE IF EXISTS assignment_round_robin CASCADE;
            CREATE TABLE assignment_round_robin (
                tenant_id INTEGER PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
                last_assigned_driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
                last_assigned_at TIMESTAMP DEFAULT NOW(),
                assignment_count INTEGER DEFAULT 1,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('✅ Schema fixed successfully!');
    } catch (err) {
        console.error('❌ Schema Fix Failed:', err.message);
    } finally {
        process.exit();
    }
}

fixSchema();
