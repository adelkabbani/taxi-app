const { Worker } = require('bullmq');
const { connection, b2bEvents } = require('../config/queues');
const db = require('../config/database');
const logger = require('../config/logger');

/**
 * B2B Background Worker
 * Processes 'new-ride' jobs. Supports both Redis (BullMQ) and In-Memory (EventEmitter) modes.
 */
class B2BWorker {
    constructor(app) {
        this.app = app;
        this.worker = null;
    }

    /**
     * Core processing logic used by both BullMQ and Dev-Lite modes.
     */
    async processRide(jobData, jobId = 'internal') {
        const { payload, tenantId, normalized } = jobData;
        const io = this.app.get('io');
        
        logger.info(`Processing B2B Ride [ID: ${jobId}] [Type: ${normalized.vehicleType}]`);

        try {
            await db.transaction(async (client) => {
                // 1. Check for Idempotency
                const externalId = payload.id || payload.booking_id || payload.reference;
                const source = payload.source || 'aggregator_api';
                
                const existing = await client.query(
                    'SELECT id FROM external_bookings WHERE external_booking_id = $1 AND source = $2',
                    [String(externalId), source]
                );

                if (existing.rows.length > 0) {
                    logger.warn(`Skipping duplicate B2B booking: ${externalId}`);
                    return;
                }

                // 2. Create the Booking Record
                const b2bRef = `B2B-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                
                const bookingResult = await client.query(`
                    INSERT INTO bookings (
                        tenant_id, 
                        booking_reference, 
                        status, 
                        pickup_address, 
                        pickup_lat, 
                        pickup_lng, 
                        dropoff_address,
                        scheduled_pickup_time,
                        fare_final,
                        payment_method,
                        passenger_notes,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                    RETURNING *
                `, [
                    tenantId || 1, 
                    b2bRef,
                    'pending',
                    payload.pickup_address || 'API Pickup',
                    parseFloat(payload.pickup_lat) || 0,
                    parseFloat(payload.pickup_lng) || 0,
                    payload.dropoff_address || 'API Dropoff',
                    payload.pickup_time || new Date(),
                    normalized.offeredPrice,
                    'partner_paid',
                    `Aggregator ID: ${externalId} | Source: ${source}`,
                ]);

                const newBooking = bookingResult.rows[0];

                // 3. Log into External Bookings mapping table
                await client.query(`
                    INSERT INTO external_bookings (
                        tenant_id, 
                        external_booking_id, 
                        source, 
                        booking_id, 
                        raw_payload, 
                        processing_status,
                        processed_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                `, [
                    tenantId || 1,
                    String(externalId),
                    source,
                    newBooking.id,
                    JSON.stringify(payload),
                    'converted'
                ]);

                // 4. Notify UI via WebSockets
                if (io) {
                    io.to('admins').emit('booking_created', newBooking);
                    logger.info(`✓ Real-time UI update emitted for booking ${newBooking.id}`);
                }
            });

            logger.info(`✓ Successfully finalized B2B booking for aggregator ID: ${payload.id || payload.booking_id}`);

        } catch (err) {
            logger.error(`! B2B Worker Processing Error [Job ${jobId}]:`, err.message);
            throw err; 
        }
    }

    start() {
        // Mode 1: Redis / BullMQ (Production)
        if (connection && connection.status !== 'end') {
            try {
                this.worker = new Worker('b2b-bookings-queue', async (job) => {
                    return await this.processRide(job.data, job.id);
                }, { connection });

                this.worker.on('completed', (job) => logger.info(`Job ${job.id} completed.`));
                this.worker.on('failed', (job, err) => logger.error(`Job ${job.id} failed: ${err.message}`));
                
                logger.info('🚀 B2B Worker: Listening via BullMQ (Redis Mode)');
            } catch (err) {
                logger.error('Failed to initialize BullMQ Worker, falling back to Internal Bus.');
                this.listenToInternalBus();
            }
        } 
        // Mode 2: Dev-Lite (Native EventEmitter)
        else {
            this.listenToInternalBus();
        }
    }

    listenToInternalBus() {
        logger.info('🚀 B2B Worker: Listening via Internal Event Bus (Dev-Lite Mode)');
        b2bEvents.on('job', async ({ name, data }) => {
            try {
                await this.processRide(data, `mock-${Date.now()}`);
            } catch (err) {
                logger.error('Internal Bus Job Error:', err.message);
            }
        });
    }
}

module.exports = B2BWorker;
