const express = require('express');
const crypto = require('crypto');
const db = require('../config/database');
const logger = require('../config/logger');

const router = express.Router();

/**
 * Verify booking.com webhook signature (HMAC-SHA256)
 * booking.com sends: X-Booking-Hmac-SHA256 header
 */
function verifyBookingComSignature(req) {
    const secret = process.env.BOOKING_COM_WEBHOOK_SECRET;
    if (!secret) return true; // Skip verification if not configured yet

    const signature = req.headers['x-booking-hmac-sha256'];
    if (!signature) return false;

    const hmac = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('base64');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac));
}

/**
 * @route   POST /api/webhooks/booking-com
 * @desc    Receive booking.com transfer reservation webhooks
 * @access  Public (verified via HMAC signature)
 */
router.post('/booking-com', async (req, res) => {
    const payload = req.body;

    // Always respond 200 quickly to acknowledge receipt
    res.json({ success: true, message: 'Webhook received' });

    try {
        // Verify signature
        if (!verifyBookingComSignature(req)) {
            logger.warn('booking.com webhook: invalid signature', { payload });
            await logWebhook(null, 'booking_com', '/api/webhooks/booking-com', payload, 401);
            return;
        }

        await logWebhook(null, 'booking_com', '/api/webhooks/booking-com', payload, 200);

        const {
            reservation_id,
            status,
            checkin,
            checkout,
            guest,
            transfer
        } = payload;

        if (!reservation_id) {
            logger.warn('booking.com webhook: missing reservation_id', { payload });
            return;
        }

        // Idempotency: skip if already processed
        const existing = await db.query(
            'SELECT id, processing_status FROM external_bookings WHERE external_booking_id = $1 AND source = $2',
            [String(reservation_id), 'booking_com']
        );

        if (existing.rows.length > 0 && existing.rows[0].processing_status === 'converted') {
            logger.info('booking.com webhook: duplicate, already converted', { reservation_id });
            return;
        }

        // Upsert into external_bookings
        const upsertResult = await db.query(`
            INSERT INTO external_bookings
                (partner_id, external_booking_id, source, raw_payload, processing_status)
            VALUES (
                (SELECT id FROM partners WHERE source_name = 'booking_com' LIMIT 1),
                $1, 'booking_com', $2, 'received'
            )
            ON CONFLICT (external_booking_id, source)
            DO UPDATE SET raw_payload = $2, processing_status = 'received'
            RETURNING id
        `, [String(reservation_id), JSON.stringify(payload)]);

        const externalBookingId = upsertResult.rows[0]?.id;

        // Handle cancellations
        if (status === 'cancelled' || status === 'no_show') {
            logger.info('booking.com webhook: cancellation received', { reservation_id, status });
            await db.query(
                'UPDATE external_bookings SET processing_status = $1, processed_at = NOW() WHERE id = $2',
                ['rejected', externalBookingId]
            );
            return;
        }

        // Build pickup/dropoff from transfer data if present
        const pickupAddress = transfer?.pickup?.address || guest?.address || 'See booking.com payload';
        const dropoffAddress = transfer?.dropoff?.address || 'See booking.com payload';
        const pickupTime = transfer?.pickup_datetime || checkin;
        const passengerName = guest ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() : 'Guest';
        const passengerPhone = guest?.phone || null;
        const passengerEmail = guest?.email || null;
        const passengers = transfer?.pax || 1;

        if (!pickupTime) {
            logger.warn('booking.com webhook: missing pickup time', { reservation_id });
            await db.query(
                'UPDATE external_bookings SET processing_status = $1, error_message = $2 WHERE id = $3',
                ['rejected', 'Missing pickup time', externalBookingId]
            );
            return;
        }

        // Auto-create booking
        const bookingResult = await db.query(`
            INSERT INTO bookings
                (tenant_id, source, passenger_name, passenger_phone, passenger_email,
                 pickup_address, dropoff_address, pickup_time, passenger_count, status, payment_method)
            VALUES (
                (SELECT id FROM partners WHERE source_name = 'booking_com' LIMIT 1 ),
                'partner', $1, $2, $3, $4, $5, $6, $7, 'pending', 'partner_paid'
            )
            RETURNING id
        `, [passengerName, passengerPhone, passengerEmail, pickupAddress, dropoffAddress, pickupTime, passengers]);

        const bookingId = bookingResult.rows[0]?.id;

        // Link external booking to the new booking
        await db.query(
            'UPDATE external_bookings SET booking_id = $1, processing_status = $2, processed_at = NOW() WHERE id = $3',
            [bookingId, 'converted', externalBookingId]
        );

        logger.info('booking.com webhook: booking created', { reservation_id, bookingId });

    } catch (err) {
        logger.error('booking.com webhook: processing error', {
            error: err.message,
            payload
        });

        // Mark as failed in external_bookings if we can
        try {
            await db.query(
                `UPDATE external_bookings SET processing_status = 'rejected', error_message = $1
                 WHERE external_booking_id = $2 AND source = 'booking_com'`,
                [err.message, String(payload?.reservation_id)]
            );
        } catch (_) {}
    }
});

async function logWebhook(tenantId, source, endpoint, payload, statusCode) {
    try {
        await db.query(
            'INSERT INTO webhook_logs (tenant_id, source, endpoint, payload, status_code) VALUES ($1, $2, $3, $4, $5)',
            [tenantId, source, endpoint, JSON.stringify(payload), statusCode]
        );
    } catch (err) {
        logger.error('Failed to log webhook', { error: err.message });
    }
}

module.exports = router;
