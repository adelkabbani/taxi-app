const db = require('./config/database');

async function verifyFleets() {
    try {
        const result = await db.query(`
            SELECT t.name as fleet, COUNT(d.id) as driver_count
            FROM tenants t
            LEFT JOIN users u ON t.id = u.tenant_id AND u.role = 'driver'
            LEFT JOIN drivers d ON u.id = d.user_id
            GROUP BY t.name
            ORDER BY t.name
        `);

        console.log('\n=== FLEET DISTRIBUTION ===');
        result.rows.forEach(row => {
            console.log(`${row.fleet}: ${row.driver_count} drivers`);
        });

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

verifyFleets();
