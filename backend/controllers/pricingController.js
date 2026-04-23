const db = require('../config/database');
const logger = require('../config/logger');
const pricingCache = require('../services/pricingCache');

/**
 * Get all pricing rules for the current tenant.
 */
exports.getPricingRules = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        
        if (!tenantId) {
            // If Super Admin view, fetch ALL rules without a filter
            const result = await db.query(
                'SELECT * FROM pricing_rules ORDER BY tenant_id ASC, vehicle_type ASC'
            );
            return res.status(200).json({
                status: 'success',
                data: result.rows
            });
        }

        // Fetch all possible rules for this tenant
        const result = await db.query(
            'SELECT * FROM pricing_rules WHERE tenant_id = $1 ORDER BY vehicle_type ASC',
            [tenantId]
        );

        res.status(200).json({
            status: 'success',
            data: result.rows
        });
    } catch (error) {
        logger.error('API Error: GET /api/pricing failed', { 
            tenantId: req.tenantId, 
            error: error.message,
            stack: error.stack 
        });
        next(error);
    }
};

/**
 * Upsert pricing rules. Expects an array of { vehicle_type, min_price }.
 */
exports.updatePricingRules = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const { rules } = req.body; // Array of items

        if (!Array.isArray(rules)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid payload: rules must be an array'
            });
        }

        // Use a transaction since we might be updating multiple rows
        await db.transaction(async (client) => {
            for (const rule of rules) {
                const { vehicle_type, min_price, is_active } = rule;
                
                if (!vehicle_type || min_price === undefined) {
                    continue; // Skip invalid entries
                }

                await client.query(`
                    INSERT INTO pricing_rules (tenant_id, vehicle_type, min_price, is_active, updated_at)
                    VALUES ($1, $2, $3, $4, NOW())
                    ON CONFLICT (tenant_id, vehicle_type) 
                    DO UPDATE SET 
                        min_price = EXCLUDED.min_price, 
                        is_active = EXCLUDED.is_active, 
                        updated_at = NOW()
                `, [tenantId, vehicle_type, parseFloat(min_price) || 0.00, is_active !== false]);
            }
        });

        // CRITICAL: Refresh the ultra-fast RAM cache immediately after DB saves!
        await pricingCache.refreshCache();
        
        // DEBUG: View exactly what rules are loaded into RAM for this tenant
        console.log('⚡ B2B PRICING CACHE REFRESHED (TENANT ' + tenantId + '):', pricingCache.getAllRules());

        res.status(200).json({
            status: 'success',
            message: 'Pricing rules updated successfully'
        });

    } catch (error) {
        logger.error('API Error: PUT /api/pricing failed', { 
            tenantId: req.tenantId, 
            error: error.message,
            stack: error.stack 
        });
        next(error);
    }
};
