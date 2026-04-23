/**
 * Operational Time Utilities
 * Handles the 4:00 AM day rollover logic for BER-based logistics
 */

/**
 * Returns the Date object for the start of the current operational day (4:00 AM)
 * If current time is before 4:00 AM, the operational day started yesterday at 4:00 AM.
 * If current time is after 4:00 AM, the operational day started today at 4:00 AM.
 */
const getOperationalDayStart = (date = new Date()) => {
    const operationalStart = new Date(date);
    operationalStart.setHours(4, 0, 0, 0);
    
    if (date < operationalStart) {
        operationalStart.setDate(operationalStart.getDate() - 1);
    }
    
    return operationalStart;
};

/**
 * Returns the Date object for the end of the current operational day (3:59:59 AM next day)
 */
const getOperationalDayEnd = (date = new Date()) => {
    const start = getOperationalDayStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(-1); // Go back 1ms from start of next day
    return end;
};

module.exports = {
    getOperationalDayStart,
    getOperationalDayEnd
};
