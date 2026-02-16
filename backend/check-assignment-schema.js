const db = require('./config/database');

async function checkSchema() {
    console.log('🔍 Checking Auto-Assignment Schema...');

    try {
        const tables = ['driver_schedules', 'assignment_attempts', 'assignment_round_robin'];

        for (const table of tables) {
            const res = await db.query(`SELECT to_regclass('public.${table}')`);
            const exists = res.rows[0].to_regclass !== null;
            console.log(`   - Table '${table}': ${exists ? '✅ Exists' : '❌ MISSING'}`);

            if (!exists && table === 'driver_schedules') {
                await createDriverSchedulesTable();
            }
            if (!exists && table === 'assignment_attempts') {
                await createAssignmentAttemptsTable();
            }
            if (!exists && table === 'assignment_round_robin') {
                await createAssignmentRoundRobinTable();
            }
        }

    } catch (err) {
        console.error('❌ Schema Check Failed:', err.message);
    } finally {
        process.exit();
    }
}

async function createDriverSchedulesTable() {
    console.log('   🔨 Creating driver_schedules table...');
    await db.query(`
        CREATE TABLE IF NOT EXISTS driver_schedules (
            id SERIAL PRIMARY KEY,
            driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
            day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX idx_driver_schedules_day_time ON driver_schedules(day_of_week, start_time, end_time);
    `);
    console.log('   ✅ Created driver_schedules');
}

async function createAssignmentAttemptsTable() {
    console.log('   🔨 Creating assignment_attempts table...');
    await db.query(`
        CREATE TABLE IF NOT EXISTS assignment_attempts (
            id SERIAL PRIMARY KEY,
            booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
            driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
            status VARCHAR(50) DEFAULT 'pending', -- pending, rejected, accepted, expired
            attempted_at TIMESTAMP DEFAULT NOW(),
            response_at TIMESTAMP
        );
        CREATE INDEX idx_assignment_attempts_booking ON assignment_attempts(booking_id);
    `);
    console.log('   ✅ Created assignment_attempts');
}

async function createAssignmentRoundRobinTable() {
    console.log('   🔨 Creating assignment_round_robin table...');
    await db.query(`
        CREATE TABLE IF NOT EXISTS assignment_round_robin (
            id SERIAL PRIMARY KEY,
            booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
            last_driver_index INTEGER DEFAULT 0,
            excluded_driver_ids INTEGER[] DEFAULT '{}',
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `);
    console.log('   ✅ Created assignment_round_robin');
}

checkSchema();
