const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function check() {
    const driverId = 8;
    const tenantId = 1;
    const timeout = process.env.LOCATION_STALENESS_TIMEOUT_SECONDS || 60;

    const query = `SELECT 
      d.*,
      u.first_name, u.last_name, u.email, u.phone, u.plain_password,
      v.license_plate, v.vehicle_type, v.make, v.model,
      vc.luggage_capacity, vc.passenger_capacity, vc.has_child_seat, vc.has_airport_permit,
      dc.languages,
      dm.acceptance_rate, dm.total_bookings, dm.accepted_bookings, dm.rejected_bookings,
      dm.cancelled_bookings, dm.late_arrivals, dm.no_shows,
      CASE 
        WHEN d.location_updated_at > NOW() - INTERVAL '${timeout} seconds' THEN false
        ELSE true
      END AS is_stale
    FROM drivers d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN vehicles v ON d.vehicle_id = v.id
    LEFT JOIN vehicle_capabilities vc ON v.id = vc.vehicle_id
    LEFT JOIN driver_capabilities dc ON d.id = dc.driver_id
    LEFT JOIN driver_metrics dm ON d.id = dm.driver_id
    WHERE d.id = $1 AND u.tenant_id = $2`;

    try {
        const res = await pool.query(query, [driverId, tenantId]);
        console.log('Result count:', res.rows.length);
        if (res.rows.length > 0) {
            console.log('Driver detail for ID 8 found');
        } else {
            console.log('Driver detail for ID 8 NOT found');
        }
    } catch (err) {
        console.error('SQL Error:', err.message);
        console.error('SQL State:', err.code);
    } finally {
        await pool.end();
    }
}

check();
