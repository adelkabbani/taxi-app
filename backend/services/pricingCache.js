const db = require('../config/database');
const logger = require('../config/logger');

class PricingCache {
    constructor() {
        // Map will store data in format: "tenantId_vehicleType" -> min_price
        this.cache = new Map();
        this.initialized = false;
    }

    /**
     * Loads all pricing rules from the database into RAM.
     * Called on server startup and after any UI updates.
     */
    async init() {
        try {
            const result = await db.query('SELECT tenant_id, vehicle_type, min_price, is_active FROM pricing_rules');
            
            this.cache.clear();

            for (const rule of result.rows) {
                const key = `${rule.tenant_id}_${rule.vehicle_type}`;
                this.cache.set(key, {
                    minPrice: parseFloat(rule.min_price),
                    isActive: rule.is_active !== false // Default to true if null
                });
            }

            this.initialized = true;
            logger.info(`✓ PricingCache initialized with ${this.cache.size} rules.`);
        } catch (error) {
            logger.error('Failed to initialize PricingCache:', error);
            // Default to empty cache instead of crashing, but standard queries will fail if expected to have values.
        }
    }

    /**
     * Refreshes the cache from the database.
     * Call this when the Admin UI updates a pricing rule.
     */
    async refreshCache() {
        logger.info('Refreshing PricingCache from database...');
        await this.init();
    }

    /**
     * O(1) Memory lookup for O(1) fast-lane validation.
     * @param {number|string} tenantId 
     * @param {string} vehicleType 
     * @returns {number|null} min_price as a Float, or null if rule not found.
     */
    getRule(tenantId, vehicleType) {
        if (!this.initialized) {
            logger.warn('PricingCache accessed before initialization!');
        }
        
        const key = `${String(tenantId)}_${vehicleType.toLowerCase()}`;
        return this.cache.get(key) || null;
    }

    /**
     * Diagnostic helper to view all rules currently in RAM.
     */
    getAllRules() {
        return Object.fromEntries(this.cache);
    }
}

// Export singleton instance
module.exports = new PricingCache();
