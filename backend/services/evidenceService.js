const db = require('../config/database');
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');
const eventLogger = require('../services/eventLogger');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Evidence Service
 * Handles evidence upload, validation, and integrity
 */

/**
 * Calculate SHA-256 hash of file for integrity verification
 */
const calculateFileHash = async (filePath) => {
    try {
        const fileBuffer = await fs.readFile(filePath);
        const hash = crypto.createHash('sha256');
        hash.update(fileBuffer);
        return hash.digest('hex');
    } catch (error) {
        logger.error('Failed to calculate file hash', { filePath, error: error.message });
        throw error;
    }
};

/**
 * Validate GPS accuracy is acceptable
 */
const validateGPSAccuracy = (accuracy) => {
    const maxAccuracy = parseInt(process.env.GPS_ACCURACY_THRESHOLD_METERS) || 50;
    return !accuracy || accuracy <= maxAccuracy;
};

/**
 * Upload evidence with GPS and timestamp
 */
const uploadEvidence = async (file, evidenceData, uploadedBy) => {
    const {
        bookingId,
        assetType,
        capturedAt,
        gpsLat,
        gpsLng,
        gpsAccuracy,
        pickupLabel,
        deviceId
    } = evidenceData;

    try {
        // Validate GPS accuracy
        if (!validateGPSAccuracy(gpsAccuracy)) {
            throw new AppError(
                `GPS accuracy too low (${gpsAccuracy}m). Maximum allowed: ${process.env.GPS_ACCURACY_THRESHOLD_METERS || 50}m`,
                400
            );
        }

        // Check if booking exists and belongs to this driver
        const bookingResult = await db.query(
            `SELECT b.*, d.id as driver_id 
       FROM bookings b
       JOIN drivers d ON b.driver_id = d.id
       WHERE b.id = $1 AND d.user_id = $2`,
            [bookingId, uploadedBy.id]
        );

        if (bookingResult.rows.length === 0) {
            // Delete uploaded file
            await fs.unlink(file.path);
            throw new AppError('Booking not found or you are not assigned to it', 404);
        }

        const booking = bookingResult.rows[0];
        const driverId = booking.driver_id;

        // Calculate file hash for integrity
        const fileHash = await calculateFileHash(file.path);

        // Store file URL (relative path)
        const fileUrl = `/uploads/evidence/${file.filename}`;

        // Insert into database
        const result = await db.query(
            `INSERT INTO proof_assets (
        booking_id, asset_type, file_url, captured_at,
        gps_lat, gps_lng, gps_accuracy_m, pickup_label, device_id, hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
            [
                bookingId,
                assetType,
                fileUrl,
                capturedAt,
                gpsLat,
                gpsLng,
                gpsAccuracy,
                pickupLabel,
                deviceId,
                fileHash
            ]
        );

        const evidence = result.rows[0];

        // Log event
        await eventLogger.logEvidenceUploaded(
            bookingId,
            booking.tenant_id,
            driverId,
            evidence.id,
            assetType
        );

        logger.info('Evidence uploaded', {
            evidenceId: evidence.id,
            bookingId,
            driverId,
            assetType,
            fileSize: file.size
        });

        return evidence;

    } catch (error) {
        // Clean up uploaded file on error
        try {
            await fs.unlink(file.path);
        } catch (unlinkError) {
            logger.error('Failed to delete uploaded file after error', {
                filePath: file.path,
                error: unlinkError.message
            });
        }
        throw error;
    }
};

/**
 * Get evidence by ID
 */
const getEvidenceById = async (evidenceId, tenantId) => {
    const result = await db.query(
        `SELECT pa.*, b.booking_reference
     FROM proof_assets pa
     JOIN bookings b ON pa.booking_id = b.id
     WHERE pa.id = $1 AND b.tenant_id = $2`,
        [evidenceId, tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Evidence not found', 404);
    }

    return result.rows[0];
};

/**
 * Get all evidence for a booking
 */
const getEvidenceByBooking = async (bookingId, tenantId) => {
    const result = await db.query(
        `SELECT pa.*
     FROM proof_assets pa
     JOIN bookings b ON pa.booking_id = b.id
     WHERE pa.booking_id = $1 AND b.tenant_id = $2
     ORDER BY pa.captured_at ASC`,
        [bookingId, tenantId]
    );

    return result.rows;
};

/**
 * Verify file integrity
 */
const verifyFileIntegrity = async (evidenceId) => {
    const evidence = await db.query(
        'SELECT * FROM proof_assets WHERE id = $1',
        [evidenceId]
    );

    if (evidence.rows.length === 0) {
        throw new AppError('Evidence not found', 404);
    }

    const evidenceRecord = evidence.rows[0];
    const filePath = path.join(
        process.env.EVIDENCE_STORAGE_PATH || './uploads/evidence',
        path.basename(evidenceRecord.file_url)
    );

    try {
        const currentHash = await calculateFileHash(filePath);
        const isValid = currentHash === evidenceRecord.hash;

        return {
            evidenceId,
            isValid,
            storedHash: evidenceRecord.hash,
            currentHash,
            message: isValid ? 'File integrity verified' : 'File has been tampered with'
        };
    } catch (error) {
        throw new AppError('File not found or cannot be read', 404);
    }
};

/**
 * Delete evidence (GDPR compliance)
 */
const deleteEvidence = async (evidenceId, deletedBy) => {
    try {
        return await db.transaction(async (client) => {
            // Get evidence record
            const result = await client.query(
                'SELECT * FROM proof_assets WHERE id = $1',
                [evidenceId]
            );

            if (result.rows.length === 0) {
                throw new AppError('Evidence not found', 404);
            }

            const evidence = result.rows[0];
            const filePath = path.join(
                process.env.EVIDENCE_STORAGE_PATH || './uploads/evidence',
                path.basename(evidence.file_url)
            );

            // Delete file from filesystem
            try {
                await fs.unlink(filePath);
            } catch (error) {
                logger.warn('Failed to delete evidence file from filesystem', {
                    filePath,
                    error: error.message
                });
            }

            // Delete database record
            await client.query(
                'DELETE FROM proof_assets WHERE id = $1',
                [evidenceId]
            );

            logger.info('Evidence deleted', {
                evidenceId,
                bookingId: evidence.booking_id,
                deletedBy: deletedBy.id,
                reason: 'GDPR compliance'
            });

            return { success: true, message: 'Evidence deleted' };
        });
    } catch (error) {
        logger.error('Failed to delete evidence', { evidenceId, error: error.message });
        throw error;
    }
};

module.exports = {
    uploadEvidence,
    getEvidenceById,
    getEvidenceByBooking,
    verifyFileIntegrity,
    deleteEvidence
};
