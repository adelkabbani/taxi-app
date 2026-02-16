const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'taxi_dispatch',
    user: 'postgres',
    password: 'adel'
});

async function createDefaultFleetDrivers() {
    const client = await pool.connect();

    try {
        // Get Default Taxi Company ID
        const tenant = await client.query("SELECT id FROM tenants WHERE name LIKE '%Default%'");
        const tenantId = tenant.rows[0].id;

        console.log(`Creating 3 new drivers for tenant ID: ${tenantId}...`);

        const newDrivers = [
            { firstName: 'Michael', lastName: 'Brown', email: 'michael.brown@default.com', phone: '+15551234567', plate: 'DEF-001' },
            { firstName: 'Sarah', lastName: 'Davis', email: 'sarah.davis@default.com', phone: '+15551234568', plate: 'DEF-002' },
            { firstName: 'James', lastName: 'Wilson', email: 'james.wilson@default.com', phone: '+15551234569', plate: 'DEF-003' }
        ];

        for (const driver of newDrivers) {
            const passwordHash = await bcrypt.hash('driver123', 10);

            // Create user
            const userResult = await client.query(
                `INSERT INTO users (tenant_id, role, email, phone, password_hash, plain_password, first_name, last_name, status)
                 VALUES ($1, 'driver', $2, $3, $4, 'driver123', $5, $6, 'active')
                 RETURNING id`,
                [tenantId, driver.email, driver.phone, passwordHash, driver.firstName, driver.lastName]
            );
            const userId = userResult.rows[0].id;

            // Create vehicle
            const vehicleResult = await client.query(
                `INSERT INTO vehicles (tenant_id, license_plate, make, model, year, vehicle_type)
                 VALUES ($1, $2, 'Toyota', 'Camry', 2023, 'sedan')
                 RETURNING id`,
                [tenantId, driver.plate]
            );
            const vehicleId = vehicleResult.rows[0].id;

            // Create driver profile
            await client.query(
                `INSERT INTO drivers (user_id, vehicle_id, license_number, availability)
                 VALUES ($1, $2, $3, 'offline')`,
                [userId, vehicleId, 'DL' + Math.random().toString().substr(2, 8)]
            );

            // Create driver metrics
            const driverIdResult = await client.query('SELECT id FROM drivers WHERE user_id = $1', [userId]);
            await client.query(
                `INSERT INTO driver_metrics (driver_id) VALUES ($1)`,
                [driverIdResult.rows[0].id]
            );

            console.log(`✅ Created: ${driver.firstName} ${driver.lastName} (${driver.plate})`);
        }

        console.log('\n🎉 Successfully created 3 new drivers for Default Taxi Company!');
        console.log('Refresh your Driver Management page to see both fleets.');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

createDefaultFleetDrivers();
