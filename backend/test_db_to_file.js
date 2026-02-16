const fs = require('fs');
require('dotenv').config();
const db = require('./config/database');

async function test() {
    try {
        const res = await db.query('SELECT 1 as test');
        fs.writeFileSync('test_output.txt', JSON.stringify(res.rows));
    } catch (err) {
        fs.writeFileSync('test_output.txt', 'ERROR: ' + err.message);
    } finally {
        process.exit();
    }
}

test();
