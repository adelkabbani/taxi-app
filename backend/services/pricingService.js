const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Pricing Service
 * Handles fare calculation, partner commissions, and business rules.
 */

/**
 * Calculate the final fare for a partner booking based on rules
 * @param {number} baseFare - The original fare calculated for the trip
 * @param {number} partnerId - ID of the partner
 * @returns {Promise<Object>} - Calculated fare details
 */
const calculatePartnerFare = async (baseFare, partnerId) => {
    try {
        const result = await db.query(
            `SELECT * FROM partner_pricing_rules WHERE partner_id = $1`,
            [partnerId]
        );

        if (result.rows.length === 0) {
            return {
                originalFare: baseFare,
                finalFare: baseFare,
                commission: 0,
                minimumApplied: false
            };
        }

        const rule = result.rows[0];
        let finalFare = baseFare;
        let minimumApplied = false;

        // 1. Check Minimum Fare Threshold (e.g., your "60 Euro" requirement)
        if (rule.min_fare_threshold && baseFare < parseFloat(rule.min_fare_threshold)) {
            finalFare = parseFloat(rule.min_fare_threshold);
            minimumApplied = true;
        }

        // 2. Add Commission if applicable
        const commission = (finalFare * (parseFloat(rule.commission_percentage || 0) / 100));

        // Note: Depending on your agreement, you might ADD the commission 
        // to the fare or SUBTRACT it from your payout. 
        // Usually, for Supply APIs, you return the total price for the traveler.

        return {
            originalFare: baseFare,
            finalFare: finalFare,
            commission: commission,
            minimumApplied: minimumApplied,
            minThreshold: rule.min_fare_threshold
        };
    } catch (error) {
        logger.error('Error calculating partner fare:', error);
        throw error;
    }
};

module.exports = {
    calculatePartnerFare
};
