const db = require('../config/database');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');

/**
 * Driver Schedule Service
 * Manages driver working hours for "Tap-to-Toggle" Monthly Calendar
 */

/**
 * Update schedule for a specific date
 */
const setSchedule = async (driverId, scheduleDate, startTime, endTime, shiftType = 'CUSTOM', isHoliday = false) => {
    try {
        const result = await db.query(
            `INSERT INTO driver_schedules (driver_id, schedule_date, start_time, end_time, shift_type, is_holiday)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (driver_id, schedule_date)
             DO UPDATE SET 
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                shift_type = EXCLUDED.shift_type,
                is_holiday = EXCLUDED.is_holiday,
                updated_at = NOW()
             RETURNING *`,
            [driverId, scheduleDate, startTime, endTime, shiftType, isHoliday]
        );

        logger.info('Driver schedule updated', { driverId, scheduleDate });
        return result.rows[0];
    } catch (error) {
        logger.error('Failed to set driver schedule', { driverId, scheduleDate, error: error.message });
        throw new AppError('Failed to update schedule', 500);
    }
};

/**
 * Batch Update Schedules for a month/range
 * expectation: schedules = [{ date, start, end, shiftType, isHoliday }]
 */
const batchUpdateSchedule = async (driverId, schedules) => {
    return await db.transaction(async (client) => {
        const results = [];

        for (const s of schedules) {
            const result = await client.query(
                `INSERT INTO driver_schedules (driver_id, schedule_date, start_time, end_time, shift_type, is_holiday)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (driver_id, schedule_date)
                 DO UPDATE SET 
                    start_time = EXCLUDED.start_time,
                    end_time = EXCLUDED.end_time,
                    shift_type = EXCLUDED.shift_type,
                    is_holiday = EXCLUDED.is_holiday,
                    updated_at = NOW()
                 RETURNING *`,
                [driverId, s.date, s.start, s.end, s.shiftType, s.isHoliday || false]
            );
            results.push(result.rows[0]);
        }

        logger.info('Driver schedules batch updated', { driverId, count: schedules.length });
        return results;
    });
};

/**
 * Remove a schedule entry for a date
 */
const deleteSchedule = async (driverId, scheduleDate) => {
    await db.query(
        'DELETE FROM driver_schedules WHERE driver_id = $1 AND schedule_date = $2',
        [driverId, scheduleDate]
    );
    return true;
};

/**
 * Get schedules for a driver in a date range
 */
const getScheduleRange = async (driverId, startDate, endDate) => {
    const result = await db.query(
        `SELECT * FROM driver_schedules 
         WHERE driver_id = $1 AND schedule_date BETWEEN $2 AND $3
         ORDER BY schedule_date ASC`,
        [driverId, startDate, endDate]
    );
    return result.rows;
};

/**
 * Critical Method: Get available drivers for a specific pickup time
 * Refactored to use schedule_date instead of day_of_week
 */
const getAvailableDrivers = async (pickupDateTime, vehicleType, tenantId) => {
    const date = new Date(pickupDateTime);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0]; // HH:MM:SS

    try {
        const query = `
            SELECT d.id, d.user_id, d.vehicle_id, d.priority_level, d.driver_type,
                   u.first_name, u.last_name, v.vehicle_type, t.priority as fleet_priority
            FROM drivers d
            JOIN users u ON d.user_id = u.id
            JOIN tenants t ON u.tenant_id = t.id
            JOIN vehicles v ON d.vehicle_id = v.id
            JOIN driver_schedules ds ON d.id = ds.driver_id
            WHERE u.tenant_id = $1
              AND LOWER(v.vehicle_type::text) = LOWER($2::text)
              AND ds.schedule_date = $3
              AND ds.is_holiday = false
              AND ds.start_time <= $4
              AND ds.end_time >= $4
              AND d.status = 'active'
              AND u.status = 'active'
            ORDER BY t.priority ASC, d.priority_level ASC, d.id ASC
        `;

        const result = await db.query(query, [tenantId, vehicleType, dateStr, timeStr]);
        return result.rows;
    } catch (error) {
        logger.error('Error finding available drivers', { error: error.message });
        return [];
    }
};

module.exports = {
    setSchedule,
    batchUpdateSchedule,
    deleteSchedule,
    getScheduleRange,
    getAvailableDrivers
};
