const { Client } = require('pg');
require('dotenv').config();

async function forceSeed() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'taxi_dispatch'
    });

    try {
        await client.connect();
        console.log('--- FORCE SEEDING ---');

        await client.query('BEGIN');

        // Cleanup
        await client.query('DELETE FROM driver_metrics');
        await client.query('DELETE FROM vehicle_capabilities');
        await client.query('DELETE FROM drivers');
        await client.query('DELETE FROM vehicles');
        await client.query("DELETE FROM users WHERE role = 'driver'");

        const tenantRes = await client.query("SELECT id FROM tenants WHERE slug = 'berlin-taxi'");
        const tenantId = tenantRes.rows[0].id;

        const drivers = [
            { first: 'Hans', last: 'Mueller', email: 'hans.driver@taxi.com', plate: 'B-TX 1001', lat: 52.3667, lng: 13.5033 },
            { first: 'Klaus', last: 'Weber', email: 'klaus.driver@taxi.com', plate: 'B-TX 1002', lat: 52.5200, lng: 13.4050 },
            { first: 'Sophie', last: 'Schmidt', email: 'sophie.driver@taxi.com', plate: 'B-TX 1003', lat: 52.5000, lng: 13.3500 }
        ];

        for (const d of drivers) {
            const userRes = await client.query(
                "INSERT INTO users (tenant_id, email, phone, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, 'dummy', $4, $5, 'driver') RETURNING id",
                [tenantId, d.email, '+49' + Math.floor(Math.random() * 10000000), d.first, d.last]
            );
            const userId = userRes.rows[0].id;

            const vehicleRes = await client.query(
                "INSERT INTO vehicles (tenant_id, license_plate, vehicle_type) VALUES ($1, $2, 'sedan') RETURNING id",
                [tenantId, d.plate]
            );
            const vehicleId = vehicleRes.rows[0].id;

            await client.query(
                "INSERT INTO drivers (user_id, vehicle_id, license_number, availability, current_lat, current_lng, location_updated_at) VALUES ($1, $2, $3, 'available', $4, $5, NOW())",
                [userId, vehicleId, 'LIC-' + d.plate, d.lat, d.lng]
            );
            console.log(`Seeded ${d.first}`);
        }

        await client.query('COMMIT');
        console.log('Force Seeding Successful');
        require('fs').writeFileSync('force-seed-ok.txt', 'OK');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Force Seeding Failed:', err.message);
        require('fs').writeFileSync('force-seed-error.txt', err.message);
    } finally {
        await client.end();
    }
}

forceSeed();
