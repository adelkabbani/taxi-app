const db = require('./config/database');

async function checkFleets() {
    try {
        const result = await db.query(`
            SELECT DISTINCT t.name as company_name, COUNT(d.id) as driver_count
            FROM tenants t
            LEFT JOIN users u ON t.id = u.tenant_id AND u.role = 'driver'
            LEFT JOIN drivers d ON u.id = d.user_id
            GROUP BY t.name
            ORDER BY t.name
        `);

        console.log('\n=== FLEETS IN DATABASE ===');
        result.rows.forEach(row => {
            console.log(`${row.company_name}: ${row.driver_count} drivers`);
        });

        console.log('\n=== ALL DRIVERS ===');
        const drivers = await db.query(`
            SELECT u.first_name, u.last_name, t.name as company
            FROM drivers d
            JOIN users u ON d.user_id = u.id
            JOIN tenants t ON u.tenant_id = t.id
            ORDER BY t.name, u.last_name
        `);

        drivers.rows.forEach(d => {
            console.log(`${d.first_name} ${d.last_name} - ${d.company}`);
        });

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

checkFleets();
