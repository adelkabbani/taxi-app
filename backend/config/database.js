const { Pool } = require('pg');
const logger = require('./logger');

// Database connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
    logger.info('New database connection established');
});

pool.on('error', (err) => {
    logger.error('Unexpected database error:', err);
    // process.exit(-1); // Don't crash the server, just log it
});

// Query helper with logging
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;

        if (process.env.LOG_LEVEL === 'debug') {
            logger.debug('Executed query', { text, duration, rows: result.rowCount });
        }

        return result;
    } catch (error) {
        logger.error('Database query error:', { text, error: error.message });
        throw error;
    }
};

// Transaction helper
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Raw query access
const raw = (text, params) => pool.query(text, params);

// Destroy pool (for graceful shutdown)
const destroy = () => pool.end();

module.exports = {
    query,
    transaction,
    raw,
    destroy,
    pool
};
