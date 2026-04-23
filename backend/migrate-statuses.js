require('dotenv').config();
const db = require('./config/database');
const logger = require('./config/logger');

async function migrate() {
    try {
        logger.info('🚀 Starting status enum migration...');
        
        // Postgres ALTER TYPE cannot be run inside a transaction block in some versions, 
        // but here we check existence first.
        
        const checkRejected = await db.query("SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'booking_status' AND e.enumlabel = 'rejected'");
        if (checkRejected.rows.length === 0) {
            await db.query("ALTER TYPE booking_status ADD VALUE 'rejected'");
            logger.info("✓ Added 'rejected' to booking_status enum");
        } else {
            logger.info("- 'rejected' already exists in enum");
        }

        const checkExpired = await db.query("SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'booking_status' AND e.enumlabel = 'expired'");
        if (checkExpired.rows.length === 0) {
            await db.query("ALTER TYPE booking_status ADD VALUE 'expired'");
            logger.info("✓ Added 'expired' to booking_status enum");
        } else {
            logger.info("- 'expired' already exists in enum");
        }

        logger.info('🏁 Migration complete');
        process.exit(0);
    } catch (err) {
        logger.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
