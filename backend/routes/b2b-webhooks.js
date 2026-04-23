const express = require('express');
const router = express.Router();
const pricingCache = require('../services/pricingCache');
const { normalizePayload } = require('../utils/b2bNormalizer');
const logger = require('../config/logger');

/**
 * The evaluation endpoint. Receives raw payloads and returns ACCEPT or REJECT instantly.
 * Performance goal: <50ms.
 */
router.post('/evaluate', (req, res) => {
    const start = Date.now();
    const tenantId = req.headers['x-tenant-id'] || '1'; // Default to 1 (Single Tenant Mode)

    // 1. Normalize
    const { vehicleType, offeredPrice } = normalizePayload(req.body);
    
    // 2. Perform lightning check against RAM cache
    const rule = pricingCache.getRule(tenantId, vehicleType);
    
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 B2B EVALUATE: [Tenant ${tenantId}] [Type ${vehicleType}] [Result: ${rule ? 'FOUND' : 'MISSING'}]`);
    }

    // 3. Logic Check
    if (!rule) {
        logger.warn(`B2B REJECT (Missing Rule): ${vehicleType} @ €${offeredPrice}`);
        return res.status(404).json({ decision: 'REJECT', reason: 'NO_RULE_CONFIGURED', ms: duration });
    }

    if (!rule.isActive) {
        logger.info(`B2B REJECT (Inactive): ${vehicleType} @ €${offeredPrice} (Inactive in UI)`);
        return res.status(406).json({ decision: 'REJECT', reason: 'VEHICLE_CLASS_INACTIVE', ms: duration });
    }

    if (offeredPrice < rule.minPrice) {
        logger.info(`B2B REJECT (Low Price): ${vehicleType} @ €${offeredPrice} (Min: €${rule.minPrice})`);
        return res.status(406).json({ decision: 'REJECT', reason: 'PRICE_TOO_LOW', ms: duration, minPrice: rule.minPrice });
    }

    // 4. Accept & Queue for background processing
    logger.info(`B2B ACCEPT: ${vehicleType} @ €${offeredPrice} (Min: €${rule.minPrice}) in ${duration}ms`);
    
    // FIRE-AND-FORGET: Hand off to the background worker via Redis
    const { b2bQueue } = require('../config/queues');
    b2bQueue.add('new-ride', {
        payload: req.body,
        tenantId: tenantId,
        normalized: { vehicleType, offeredPrice }
    }).catch(err => logger.error('! Failed to queue B2B booking:', err.message));

    res.status(200).json({ 
        decision: 'ACCEPT', 
        ms: duration,
        data: { vehicleType, rulePrice: rule.minPrice } 
    });
});

module.exports = router;
