const redis = require('redis');
const logger = require('./logger');

// In-memory fallback storage for when Redis is not available
const memoryStorage = new Map();
let isRedisConnected = false;

// Create Redis client
const client = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        connectTimeout: 5000 // 5 second timeout
    },
    password: process.env.REDIS_PASSWORD || undefined,
    legacyMode: false
});

// Error handling
client.on('error', (err) => {
    // Only log if we were previously connected or if it's a new error
    if (isRedisConnected) {
        logger.error('Redis Client Error:', err.message);
        isRedisConnected = false;
    }
});

client.on('connect', () => {
    logger.info('Redis client connected');
});

client.on('ready', () => {
    logger.info('✓ Redis client ready');
    isRedisConnected = true;
});

client.on('end', () => {
    isRedisConnected = false;
});

// Connect to Redis safely
(async () => {
    try {
        await client.connect();
    } catch (error) {
        logger.warn('Redis connection failed. Using in-memory fallback storage.');
        isRedisConnected = false;
    }
})();

// Helper functions with fallback logic

const setex = async (key, seconds, value) => {
    try {
        if (isRedisConnected) {
            await client.setEx(key, seconds, JSON.stringify(value));
        } else {
            // Fallback to memory
            memoryStorage.set(key, JSON.stringify(value));
            // Auto-delete after expiration
            setTimeout(() => memoryStorage.delete(key), seconds * 1000);
        }
    } catch (error) {
        logger.error('Redis/Memory SETEX error:', error.message);
        // Fail silent but log
    }
};

const get = async (key) => {
    try {
        let value;
        if (isRedisConnected) {
            value = await client.get(key);
        } else {
            value = memoryStorage.get(key);
        }
        return value ? JSON.parse(value) : null;
    } catch (error) {
        logger.error('Redis/Memory GET error:', error.message);
        return null;
    }
};

const del = async (key) => {
    try {
        if (isRedisConnected) {
            await client.del(key);
        } else {
            memoryStorage.delete(key);
        }
    } catch (error) {
        logger.error('Redis/Memory DEL error:', error.message);
    }
};

const exists = async (key) => {
    try {
        if (isRedisConnected) {
            return await client.exists(key);
        } else {
            return memoryStorage.has(key) ? 1 : 0;
        }
    } catch (error) {
        logger.error('Redis/Memory EXISTS error:', error.message);
        return 0;
    }
};

const incr = async (key) => {
    try {
        if (isRedisConnected) {
            return await client.incr(key);
        } else {
            const current = parseInt(memoryStorage.get(key)) || 0;
            const next = current + 1;
            memoryStorage.set(key, next.toString());
            return next;
        }
    } catch (error) {
        logger.error('Redis/Memory INCR error:', error.message);
        return 1;
    }
};

const expire = async (key, seconds) => {
    try {
        if (isRedisConnected) {
            await client.expire(key, seconds);
        } else if (memoryStorage.has(key)) {
            setTimeout(() => memoryStorage.delete(key), seconds * 1000);
        }
    } catch (error) {
        logger.error('Redis/Memory EXPIRE error:', error.message);
    }
};

module.exports = {
    client,
    setex,
    get,
    del,
    exists,
    incr,
    expire,
    ping: async () => {
        if (isRedisConnected) return client.ping();
        return 'PONG (In-Memory Fallback Active)';
    },
    quit: async () => {
        if (isRedisConnected) return client.quit();
        return true;
    }
};
