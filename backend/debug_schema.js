const fs = require('fs');
async function checkSchema() {
    try {
        const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bookings'");
        fs.writeFileSync('schema.json', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        fs.writeFileSync('schema_error.txt', e.message);
    } finally {
        process.exit(0);
    }
}

checkSchema();
