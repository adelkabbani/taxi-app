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
let dailyJob = null;
let io = null;

/**
 * Main engine logic to find and assign bookings
 */
const runAssignmentEngine = async (tenantId = null) => {
    if (isRunning) return { success: false, message: 'Engine already running' };
    isRunning = true;



    try {
        const query = `
            SELECT b.id, b.scheduled_pickup_time, b.booking_reference, b.fare_estimate, 
                   COALESCE(t.auto_assign_min_fare, 0) as auto_assign_min_fare
            FROM bookings b
            LEFT JOIN tenants t ON b.tenant_id = t.id
            WHERE b.status = 'pending'
              AND b.driver_id IS NULL
              AND b.assignment_method != 'manual'
              AND b.assignment_method != 'auto_failed'
              AND b.auto_assignment_attempts < 5
              AND b.scheduled_pickup_time <= NOW() + INTERVAL '12 hours'
              AND b.scheduled_pickup_time > NOW()
              AND (t.stop_sell IS NULL OR t.stop_sell = false)
              AND (b.fare_estimate IS NULL OR b.fare_estimate >= COALESCE(t.auto_assign_min_fare, 0))
              AND ($1::int IS NULL OR b.tenant_id = $1 OR b.tenant_id IS NULL)
            ORDER BY b.scheduled_pickup_time ASC
        `;

        const result = await db.query(query, [tenantId]);


        let successCount = 0;
        if (result.rows.length > 0) {
            for (const booking of result.rows) {
                const wasAssigned = await assignmentService.assignBooking(booking.id).catch(err => {
                    logger.error(`Assignment failed for ${booking.booking_reference}`, { error: err.message });
                    return false;
                });
                if (wasAssigned) successCount++;
            }

            // Emit real-time update events
            if (io && successCount > 0) {

                io.emit('bookings_updated');
                
                // If it was a tenant-specific run, broadcast success to that tenant's admins
                if (tenantId && io.broadcastAssignmentSuccess) {
                    io.broadcastAssignmentSuccess(tenantId, { count: successCount });
                }
            }
        }
        
        return { success: true, processed: successCount };
    } catch (error) {
        logger.error('Assignment engine error', { error: error.message });
        throw error;
    } finally {
        isRunning = false;
    }
};

const start = (ioInstance = null) => {
    if (ioInstance) {
        io = ioInstance;
        logger.info('Socket.io instance attached to Assignment Scheduler');
    }
    
    logger.info('Starting Auto-Assignment Scheduler (60s tick + 3PM Daily)');

    // 1. Every minute check (60s tick)
    job = cron.schedule('* * * * *', async () => {
        await runAssignmentEngine();
    });

    // 2. Fixed Daily Cron at 15:00 (3 PM)
    dailyJob = cron.schedule('0 15 * * *', async () => {
        logger.info('--- TRIGGERING DAILY 3PM AUTO-ASSIGNMENT BATCH ---');
        await runAssignmentEngine();
        logger.info('--- DAILY 3PM AUTO-ASSIGNMENT BATCH COMPLETE ---');
    });
};

const stop = () => {
    if (job) {
        job.stop();
    }
    if (dailyJob) {
        dailyJob.stop();
    }
    logger.info('Auto-Assignment Scheduler stopped');
};

module.exports = {
    start,
    stop,
    runAssignmentEngine
};
