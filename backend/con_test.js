require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function test() {
    console.log('START');
    const timer = setTimeout(() => {
        console.log('TIMEOUT');
        process.exit(1);
    }, 4000);

    try {
        const res = await db.query('SELECT 1');
        console.log('RESULT', res.rows);
    } catch (e) {
        console.error('ERROR', e);
    } finally {
        clearTimeout(timer);
        process.exit(0);
    }
}
test();
