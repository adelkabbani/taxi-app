const cron = require('node-cron');
const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Nightly Auto-Sweeper
 * Background worker that runs once per day at 03:00 AM to expire stale bookings.
 * Only targets PENDING or ASSIGNED rides from previous calendar days.
 */

let sweepJob = null;

/**
 * Executes the sweep logic
 */
const performNightlySweep = async () => {
    logger.info('--- STARTING NIGHTLY AUTO-SWEEPER BATCH (03:00 AM) ---');
    
    try {
        // Find bookings from previous days (before today's 00:00:00)
        // that are still in 'pending' or 'assigned' state.
        const query = `
            UPDATE bookings 
            SET status = 'expired', 
                updated_at = NOW()
            WHERE status IN ('pending', 'assigned')
              AND scheduled_pickup_time < CURRENT_DATE
            RETURNING id, booking_reference;
        `;

        const result = await db.query(query);

        if (result.rows.length > 0) {
            logger.info(`SUCCESS: Nightly sweep expired ${result.rows.length} stale bookings.`, {
                expiredReferences: result.rows.map(r => r.booking_reference)
            });
        } else {
            logger.info('Nightly sweep complete: No stale bookings found to expire.');
        }

    } catch (error) {
        logger.error('Nightly sweep failed!', { error: error.message });
    }
};

/**
 * Starts the cron job
 */
const start = () => {
    logger.info('Initializing Nightly Auto-Sweeper [Scheduled: 03:00 AM Daily]');

    // Schedule: Minute (0), Hour (3), DayOfMonth (*), Month (*), DayOfWeek (*)
    sweepJob = cron.schedule('0 3 * * *', async () => {
        await performNightlySweep();
    });
};

/**
 * Stops the cron job (for graceful shutdown)
 */
const stop = () => {
    if (sweepJob) {
        sweepJob.stop();
        logger.info('Nightly Auto-Sweeper stopped');
    }
};

module.exports = {
    start,
    stop,
    performNightlySweep // Exported for manual trigger/testing
};
