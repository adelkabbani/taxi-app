const evidenceService = require('../services/evidenceService');
const { AppError } = require('../middleware/errorHandler');

/**
 * Evidence Controller
 * Handles HTTP requests for evidence upload and retrieval
 */

/**
 * Upload evidence
 */
const uploadEvidence = async (req, res) => {
    if (!req.file) {
        throw new AppError('No file uploaded', 400);
    }

    const evidenceData = {
        bookingId: parseInt(req.body.bookingId),
        assetType: req.body.assetType,
        capturedAt: req.body.capturedAt,
        gpsLat: parseFloat(req.body.gpsLat),
        gpsLng: parseFloat(req.body.gpsLng),
        gpsAccuracy: req.body.gpsAccuracy ? parseFloat(req.body.gpsAccuracy) : null,
        pickupLabel: req.body.pickupLabel,
        deviceId: req.body.deviceId
    };

    const evidence = await evidenceService.uploadEvidence(
        req.file,
        evidenceData,
        req.user
    );

    res.status(201).json({
        success: true,
        data: evidence,
        message: 'Evidence uploaded successfully'
    });
};

/**
 * Get evidence by ID
 */
const getEvidenceById = async (req, res) => {
    const { id } = req.params;

    const evidence = await evidenceService.getEvidenceById(
        parseInt(id),
        req.tenantId
    );

    res.json({
        success: true,
        data: evidence
    });
};

/**
 * Get all evidence for a booking
 */
const getEvidenceByBooking = async (req, res) => {
    const { bookingId } = req.params;

    const evidence = await evidenceService.getEvidenceByBooking(
        parseInt(bookingId),
        req.tenantId
    );

    res.json({
        success: true,
        data: evidence
    });
};

/**
 * Delete evidence (admin only)
 */
const deleteEvidence = async (req, res) => {
    const { id } = req.params;

    const result = await evidenceService.deleteEvidence(
        parseInt(id),
        req.user
    );

    res.json({
        success: true,
        message: 'Evidence deleted successfully'
    });
};

module.exports = {
    uploadEvidence,
    getEvidenceById,
    getEvidenceByBooking,
    deleteEvidence
};
