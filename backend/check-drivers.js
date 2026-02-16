const db = require('./config/database');

async function checkDrivers() {
    try {
        const res = await db.query('SELECT u.first_name, u.last_name, d.availability, d.location_updated_at FROM drivers d JOIN users u ON d.user_id = u.id');
        console.log('DRIVERS_FOUND_COUNT:', res.rows.length);
        console.table(res.rows);
    } catch (err) {
        console.error('DB_ERROR:', err.message);
    } finally {
        process.exit();
    }
}

checkDrivers();
