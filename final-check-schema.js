const db = require('./backend/config/database');

async function check() {
    try {
        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'bookings' 
            AND column_name IN ('assignment_method', 'auto_assignment_attempts')
        `);
        console.log('Found columns:', res.rows);
        if (res.rows.length !== 2) {
            console.log('❌ MISSING COLUMNS!');
        } else {
            console.log('✅ Columns confirmed.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
