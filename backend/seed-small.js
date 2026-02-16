const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function smallSeed() {
    const client = await pool.connect();
    const log = (m) => fs.appendFileSync('small-seed.log', m + '\n');
    try {
        if (fs.existsSync('small-seed.log')) fs.unlinkSync('small-seed.log');
        log('Small seed starting...');

        const tenantRes = await client.query("SELECT id FROM tenants WHERE slug = 'berlin-taxi'");
        if (tenantRes.rows.length === 0) {
            log('Tenant not found. Creating tenant...');
            const t = await client.query("INSERT INTO tenants (name, slug) VALUES ('Berlin Taxi', 'berlin-taxi') RETURNING id");
            tenantId = t.rows[0].id;
        } else {
            tenantId = tenantRes.rows[0].id;
        }

        const driverPass = '$2b$10$H2T'; // Using a placeholder for speed

        const drivers = [
            { first: 'Hans', last: 'Mueller', phone: '+49222222222', plate: 'B-TX 1001', lat: 52.3667, lng: 13.5033, type: 'sedan' }
        ];

        for (const d of drivers) {
            log(`Processing ${d.first}...`);
            const userRes = await client.query(
                "INSERT INTO users (tenant_id, email, phone, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6, 'driver') ON CONFLICT DO NOTHING RETURNING id",
                [tenantId, `${d.first}.driver@taxi.com`, d.phone, driverPass, d.first, d.last]
            );

            let userId = userRes.rows.length > 0 ? userRes.rows[0].id : (await client.query("SELECT id FROM users WHERE email = $1", [`${d.first}.driver@taxi.com`])).rows[0].id;

            const vehicleRes = await client.query(
                "INSERT INTO vehicles (tenant_id, license_plate, vehicle_type) VALUES ($1, $2, 'sedan') ON CONFLICT DO NOTHING RETURNING id",
                [tenantId, d.plate]
            );

            let vehicleId = vehicleRes.rows.length > 0 ? vehicleRes.rows[0].id : (await client.query("SELECT id FROM vehicles WHERE license_plate = $1", [d.plate])).rows[0].id;

            await client.query(
                "INSERT INTO drivers (user_id, vehicle_id, license_number, availability, current_lat, current_lng) VALUES ($1, $2, $3, 'available', $4, $5) ON CONFLICT DO NOTHING",
                [userId, vehicleId, 'LIC-' + d.plate, d.lat, d.lng]
            );
            log(`Inserted driver ${d.first}`);
        }
        log('Small seed complete!');
        process.exit(0);
    } catch (err) {
        log('Small seed ERROR: ' + err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

smallSeed();
