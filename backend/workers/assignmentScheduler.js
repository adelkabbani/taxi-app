const cron = require('node-cron');
const db = require('../config/database');
const logger = require('../config/logger');
const assignmentService = require('../services/assignmentService');

/**
 * Assignment Scheduler
 * Background worker that scans for bookings needing auto-assignment
 */

let isRunning = false;
let job = null;

const start = () => {
    logger.info('Starting Auto-Assignment Scheduler (60s tick)');

    job = cron.schedule('* * * * *', async () => {
        if (isRunning) return;
        isRunning = true;

        try {
            // Find bookings that need assignment:
            // 1. Status is 'pending'
            // 2. No driver assigned
            // 3. Within 24h window
            // 4. Not manually handled
            // 5. Haven't exceeded retry limits
            // 6. Tenant has NOT enabled stop_sell
            // 7. Booking fare is >= tenant's auto_assign_min_fare
            const query = `
                SELECT b.id, b.scheduled_pickup_time, b.booking_reference, b.fare_estimate, t.auto_assign_min_fare
                FROM bookings b
                JOIN tenants t ON b.tenant_id = t.id
                WHERE b.status = 'pending'
                  AND b.driver_id IS NULL
                  AND b.assignment_method != 'manual'
                  AND b.assignment_method != 'auto_failed'
                  AND b.auto_assignment_attempts < 5
                  AND b.scheduled_pickup_time <= NOW() + INTERVAL '24 hours'
                  AND b.scheduled_pickup_time > NOW()
                  AND t.stop_sell = false
                  AND (b.fare_estimate IS NULL OR b.fare_estimate >= t.auto_assign_min_fare)
                ORDER BY b.scheduled_pickup_time ASC
            `;

            const result = await db.query(query);

            if (result.rows.length > 0) {
                logger.info(`Found ${result.rows.length} bookings eligible for auto-assignment (StopSell=OFF, PriceFilter=OK)`);
            }

            for (const booking of result.rows) {
                const now = new Date();
                const pickupTime = new Date(booking.scheduled_pickup_time);
                const diffMs = pickupTime - now;
                const diffHours = diffMs / (1000 * 60 * 60);

                // Match anything within 24h window
                logger.info(`Triggering auto-assignment for ${booking.booking_reference}`, { diffHours });
                await assignmentService.assignBooking(booking.id).catch(err => {
                    logger.error(`Assignment failed for ${booking.booking_reference}`, { error: err.message });
                });
            }
        } catch (error) {
            logger.error('Assignment scheduler loop error', { error: error.message });
        } finally {
            isRunning = false;
        }
    });
};

const stop = () => {
    if (job) {
        job.stop();
        logger.info('Auto-Assignment Scheduler stopped');
    }
};

module.exports = {
    start,
    stop
};
