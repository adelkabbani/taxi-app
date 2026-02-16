require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function test() {
    try {
        await db.query('SELECT priority_level FROM drivers LIMIT 1');
        fs.writeFileSync('test_col.txt', 'EXISTS');
    } catch (e) {
        fs.writeFileSync('test_col.txt', 'ERROR: ' + e.message);
    }
    process.exit();
}
test();
