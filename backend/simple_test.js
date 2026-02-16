console.log('Hello from Backend');
try {
    const { Pool } = require('pg');
    console.log('PG loaded');
} catch (e) {
    console.error('PG failed', e);
}
