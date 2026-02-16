const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Event Logger Service
 * Centralized event logging for disputes, refunds, and compliance
 */

const eventTypes = {
    // Booking lifecycle
    BOOKING_CREATED: 'booking_created',
    DRIVER_ASSIGNED: 'driver_assigned',
    DRIVER_ACCEPTED: 'driver_accepted',
    DRIVER_REJECTED: 'driver_rejected',
    DRIVER_ARRIVED: 'driver_arrived',
    WAITING_STARTED: 'waiting_started',
    TRIP_STARTED: 'trip_started',
    TRIP_COMPLETED: 'trip_completed',
    BOOKING_CANCELLED: 'booking_cancelled',

    // No-show process
    NO_SHOW_REQUESTED: 'no_show_requested',
    NO_SHOW_CONFIRMED: 'no_show_confirmed',
    NO_SHOW_REJECTED: 'no_show_rejected',

    // Evidence
    EVIDENCE_UPLOADED: 'evidence_uploaded',

    // Money events
    WAITING_FEE_APPLIED: 'waiting_fee_applied',
    NO_SHOW_FEE_APPLIED: 'no_show_fee_applied',
    INVOICE_GENERATED: 'invoice_generated',
    PAYMENT_RECEIVED: 'payment_received',

    // Admin actions
    ADMIN_OVERRIDE: 'admin_override',
    STATUS_MANUALLY_CHANGED: 'status_manually_changed',

    // System events
    AUTO_RELEASE: 'auto_release',
    LOCATION_STALE: 'location_stale',

    // External
    WEBHOOK_RECEIVED: 'webhook_received',
    EXTERNAL_BOOKING_CONVERTED: 'external_booking_converted',

    // Driver tracking
    DRIVER_ON_TRACK: 'driver_on_track',
    DRIVER_AT_RISK: 'driver_at_risk',
    DRIVER_OFF_TRACK: 'driver_off_track'
};

/**
 * Log event to both booking_timeline and event_logs
 */
const logEvent = async (eventData) => {
    const {
        bookingId,
        tenantId,
        eventType,
        actorType = 'system',
        actorId = null,
        details = {},
        client: providedClient = null
    } = eventData;

    try {
        const execute = async (client) => {
            // Insert into booking_timeline
            if (bookingId) {
                await client.query(
                    `INSERT INTO booking_timeline (booking_id, event_type, actor_type, actor_id, details)
           VALUES ($1, $2, $3, $4, $5)`,
                    [bookingId, eventType, actorType, actorId, JSON.stringify(details)]
                );
            }

            // Insert into event_logs (immutable)
            await client.query(
                `INSERT INTO event_logs (tenant_id, booking_id, event_type, actor_type, actor_id, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [tenantId, bookingId, eventType, actorType, actorId, JSON.stringify(details)]
            );
        };

        if (providedClient) {
            await execute(providedClient);
        } else {
            await db.transaction(execute);
        }

        logger.info('Event logged', {
            bookingId,
            eventType,
            actorType,
            actorId
        });

    } catch (error) {
        logger.error('Failed to log event', {
            eventType,
            error: error.message
        });
        // Don't throw - event logging failure shouldn't break the main flow
    }
};

/**
 * Helper: Log booking created
 */
const logBookingCreated = (bookingId, tenantId, createdBy, details = {}, client = null) => {
    return logEvent({
        bookingId,
        tenantId,
        eventType: eventTypes.BOOKING_CREATED,
        actorType: createdBy.type || 'admin',
        actorId: createdBy.id,
        details: {
            pickup: details.pickup,
            dropoff: details.dropoff,
            scheduledTime: details.scheduledTime,
            partnerId: details.partnerId
        },
        client
    });
};

/**
 * Helper: Log driver assignment
 */
const logDriverAssigned = (bookingId, tenantId, driverId, assignedBy, client = null) => {
    return logEvent({
        bookingId,
        tenantId,
        eventType: eventTypes.DRIVER_ASSIGNED,
        actorType: assignedBy.type || 'admin',
        actorId: assignedBy.id,
        details: { driverId },
        client
    });
};

/**
 * Helper: Log driver acceptance
 */
const logDriverAccepted = (bookingId, tenantId, driverId, client = null) => {
    return logEvent({
        bookingId,
        tenantId,
        eventType: eventTypes.DRIVER_ACCEPTED,
        actorType: 'driver',
        actorId: driverId,
        details: { acceptedAt: new Date().toISOString() },
        client
    });
};

/**
 * Helper: Log driver rejection
 */
const logDriverRejected = (bookingId, tenantId, driverId, reason, client = null) => {
    return logEvent({
        bookingId,
        tenantId,
        eventType: eventTypes.DRIVER_REJECTED,
        actorType: 'driver',
        actorId: driverId,
        details: { reason },
        client
    });
};

/**
 * Helper: Log driver arrived
 */
const logDriverArrived = (bookingId, tenantId, driverId, location, client = null) => {
    return logEvent({
        bookingId,
        tenantId,
        eventType: eventTypes.DRIVER_ARRIVED,
        actorType: 'driver',
        actorId: driverId,
        details: {
            lat: location.lat,
            lng: location.lng,
            accuracy: location.accuracy,
            geoCheckPassed: location.geoCheckPassed,
            distanceFromPickup: location.distanceFromPickup
        },
        client
    });
};

/**
 * Helper: Log waiting started
 */
const logWaitingStarted = (bookingId, tenantId, client = null) => {
    return logEvent({
        bookingId,
        tenantId,
        eventType: eventTypes.WAITING_STARTED,
        actorType: 'system',
        details: { startedAt: new Date().toISOString() },
        client
    });
};

/**
 * Helper: Log no-show request
 */
const logNoShowRequested = (bookingId, tenantId, driverId, evidenceIds, client = null) => {
    return logEvent({
        bookingId,
        tenantId,
        eventType: eventTypes.NO_SHOW_REQUESTED,
        actorType: 'driver',
        actorId: driverId,
        details: {
            evidenceIds,
            requestedAt: new Date().toISOString()
        },
        client
    });
};

/**
 * Helper: Log no-show confirmation
 */
const logNoShowConfirmed = (bookingId, tenantId, confirmedBy, fee, client = null) => {
    return logEvent({
        bookingId,
        tenantId,
        eventType: eventTypes.NO_SHOW_CONFIRMED,
        actorType: confirmedBy.type || 'admin',
        actorId: confirmedBy.id,
        details: {
            noShowFee: fee,
            confirmedAt: new Date().toISOString()
        },
        client
    });
};

/**
 * Helper: Log evidence upload
 */
const logEvidenceUploaded = (bookingId, tenantId, uploadedBy, evidenceId, evidenceType) => {
    return logEvent({
        bookingId,
        tenantId,
        eventType: eventTypes.EVIDENCE_UPLOADED,
        actorType: 'driver',
        actorId: uploadedBy,
        details: {
            evidenceId,
            evidenceType,
            uploadedAt: new Date().toISOString()
        }
    });
};

/**
 * Helper: Log admin override
 */
const logAdminOverride = (bookingId, tenantId, adminId, oldStatus, newStatus, reason, client = null) => {
    return logEvent({
        bookingId,
        tenantId,
        eventType: eventTypes.ADMIN_OVERRIDE,
        actorType: 'admin',
        actorId: adminId,
        details: {
            oldStatus,
            newStatus,
            reason,
            overriddenAt: new Date().toISOString()
        },
        client
    });
};

/**
 * Helper: Log waiting fee applied
 */
const logWaitingFeeApplied = (bookingId, tenantId, fee, waitMinutes) => {
    return logEvent({
        bookingId,
        tenantId,
        eventType: eventTypes.WAITING_FEE_APPLIED,
        actorType: 'system',
        details: {
            waitingFee: fee,
            totalWaitMinutes: waitMinutes,
            appliedAt: new Date().toISOString()
        }
    });
};

module.exports = {
    eventTypes,
    logEvent,
    logBookingCreated,
    logDriverAssigned,
    logDriverAccepted,
    logDriverRejected,
    logDriverArrived,
    logWaitingStarted,
    logNoShowRequested,
    logNoShowConfirmed,
    logEvidenceUploaded,
    logAdminOverride,
    logWaitingFeeApplied
};
