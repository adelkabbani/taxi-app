const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const EventEmitter = require('events');
const logger = require('./logger');

// Internal Event Bus for 'Dev-Lite' Fallback (No Redis Mode)
const b2bEvents = new EventEmitter();

/**
 * MockB2BQueue: Mimics the BullMQ Queue interface.
 * Redirects 'add' calls to the local event emitter for zero-dependency development.
 */
class MockB2BQueue {
    constructor() {
        this.isMock = true;
        logger.warn('⚠️ WARNING: BullMQ is running in MOCK (In-Memory) mode. Redis is not available.');
    }

    async add(name, data) {
        // Use setImmediate to ensure the loop finishes and returns the HTTP response first,
        // maintaining the 0ms 'fast-bind' performance.
        setImmediate(() => {
            b2bEvents.emit('job', { name, data });
        });
        return { id: `mock-${Date.now()}` };
    }
}

// 1. Initial Redis check
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

let b2bQueue;
let connection;

// In local Windows development without Redis, we automatically switch to Mock mode.
if (!REDIS_HOST || REDIS_HOST === 'localhost' && process.env.NODE_ENV === 'development') {
    // If you want to FORCE Redis in dev, set process.env.USE_REDIS_QUEUE = 'true'
    if (process.env.USE_REDIS_QUEUE !== 'true') {
        b2bQueue = new MockB2BQueue();
    }
}

if (!b2bQueue) {
    logger.info(`Connecting to BullMQ Redis at ${REDIS_HOST}:${REDIS_PORT}...`);
    connection = new IORedis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        // Fast fail if Redis isn't there
        connectTimeout: 2000, 
    });

    connection.on('error', (err) => {
        // If we hit a connection error and we're in dev, swap to mock silently
        if (err.code === 'ECONNREFUSED' && !b2bQueue) {
            logger.error('! BullMQ Redis Connection Refused. Switching to Dev-Lite Fallback.');
            b2bQueue = new MockB2BQueue();
        }
    });

    b2bQueue = new Queue('b2b-bookings-queue', { 
        connection,
        defaultJobOptions: { attempts: 3, removeOnComplete: true }
    });
}

module.exports = {
    b2bQueue,
    b2bEvents, // Used by worker to listen in mock mode
    connection
};
