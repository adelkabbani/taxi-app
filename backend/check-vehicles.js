const db = require('./config/database');

async function checkVehicles() {
    try {
        console.log('Checking Driver Vehicles...');
        const res = await db.query(`
            SELECT d.id as driver_id, d.vehicle_id, v.vehicle_type, v.license_plate
            FROM drivers d 
            LEFT JOIN vehicles v ON d.vehicle_id = v.id
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkVehicles();
