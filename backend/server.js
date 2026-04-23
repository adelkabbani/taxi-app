const fs = require('fs');
const path = require('path');

// CAPTURE SILENT CRASHES IMMEDIATELY
process.on('uncaughtException', (err) => {
    const errorMsg = `CRITICAL STARTUP ERROR: ${err.message}\nSTACK: ${err.stack}\n`;
    fs.writeFileSync(path.join(__dirname, 'CRITICAL_CRASH.txt'), errorMsg);
    console.error(errorMsg);
    process.exit(1);
});

console.log('SERVER INIT REACHED');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Import configurations
const logger = require('./config/logger');
const db = require('./config/database');
const redis = require('./config/redis');
// const setupSwagger = require('./docs/swagger'); // DISABLED: Module missing in current workspace
const pricingCache = require('./services/pricingCache');

// Import middleware
const authMiddleware = require('./middleware/auth');
const rateLimiter = require('./middleware/rateLimiter');
const requestTracing = require('./middleware/requestTracing');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const driverRoutes = require('./routes/drivers');
const partnerRoutes = require('./routes/partners');
const evidenceRoutes = require('./routes/evidence');
const invoiceRoutes = require('./routes/invoices');
const webhookRoutes = require('./routes/webhooks');
const healthRoutes = require('./routes/health');
const statsRoutes = require('./routes/stats');
const tenantRoutes = require('./routes/tenants');
const driverScheduleRoutes = require('./routes/driverSchedules');
const documentsRoutes = require('./routes/documents');
const pricingRoutes = require('./routes/pricing');
const assignmentScheduler = require('./workers/assignmentScheduler');
const nightlySweeper = require('./workers/nightlySweeper');

// Integration routes (external partners)
const welcomePickupsRoutes = require('./routes/integrations/welcomePickups');
const B2BWorker = require('./services/b2bWorker');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io for real-time updates
const io = new Server(server, {
  cors: {
    origin: [
      process.env.ADMIN_WEB_URL || 'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost',
      'capacitor://localhost',
      'http://192.168.178.152:3002',
      'http://192.168.178.152:5174'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io available to routes and other services
app.set('io', io);

// Initialize Socket.io handlers (this adds custom broadcast methods)
const socketHandler = require('./websocket/socketHandler');
socketHandler(io);

module.exports = { app, server, io };

// ============================================
// MIDDLEWARE STACK
// ============================================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: [
    process.env.ADMIN_WEB_URL || 'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost',
    'capacitor://localhost',
    'http://192.168.178.152:3002',
    'http://192.168.178.152:5174'
  ],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploaded evidence photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request tracing (correlation IDs)
app.use(requestTracing);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Rate limiting (global)
app.use(rateLimiter.global);

// ============================================
// ROUTES
// ============================================

// Health check (no auth required)
app.use('/api/health', healthRoutes);

// Webhooks (signature verification, not JWT)
app.use('/api/webhooks', webhookRoutes);

// Partner integrations (API key auth, not JWT)
app.use('/api/integrations/welcome-pickups', welcomePickupsRoutes);
app.use('/api/b2b-webhooks', require('./routes/b2b-webhooks'));

// Authentication routes
app.use('/api/auth', authRoutes);

app.get('/api/settings-test', (req, res) => {
  res.json({ message: 'API is reachable' });
});

const adminRoutes = require('./routes/admin');

// Protected routes (require authentication)
app.use('/api/bookings', authMiddleware.protect, bookingRoutes);
app.use('/api/drivers', authMiddleware.protect, driverRoutes);
app.use('/api/partners', authMiddleware.protect, authMiddleware.restrictTo('admin'), partnerRoutes);
app.use('/api/admin', authMiddleware.protect, authMiddleware.restrictTo('admin'), adminRoutes);
app.use('/api/evidence', authMiddleware.protect, evidenceRoutes);
app.use('/api/invoices', authMiddleware.protect, invoiceRoutes);
app.use('/api/stats', authMiddleware.protect, statsRoutes);
app.use('/api/documents', authMiddleware.protect, documentsRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/driver-schedules', driverScheduleRoutes);
app.use('/api/pricing', authMiddleware.protect, authMiddleware.restrictTo('admin'), pricingRoutes);
app.use('/api/notifications', authMiddleware.protect, require('./routes/notifications'));

// Status route (helpful for debugging)
app.get('/', (req, res) => {
  if (systemStatus.db) {
    res.send('Taxi Dispatch API is Running 🟢');
  } else {
    res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
          <h1 style="color: red;">⚠️ Database Connection Failed</h1>
          <p>The backend server is running, but it cannot connect to PostgreSQL.</p>
          <p><strong>Reason:</strong> Database connection is down.</p>
          <hr/>
          <h3>How to Fix:</h3>
          <p>1. Open <code>backend/.env</code> file</p>
          <p>2. Find line <code>DB_PASSWORD=...</code></p>
          <p>3. Enter your correct local PostgreSQL password</p>
          <p>4. Save the file. The server will auto-restart.</p>
        </body>
      </html>
    `);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);



// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 3000;

// Global System Status
let systemStatus = {
  db: false,
  redis: false
};

async function startServer() {
    // 1. Immediately bind the port so the proxy doesn't get ECONNREFUSED
    server.listen(PORT, '0.0.0.0', () => {
        logger.info(`✓ Server (Core) listening on port ${PORT}`);
        logger.info(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    try {
        // 2. Database connection with retries
        const MAX_RETRIES = 5;
        for (let i = 1; i <= MAX_RETRIES; i++) {
            try {
                await db.raw('SELECT 1');
                logger.info('✓ Database connected');
                systemStatus.db = true;
                break;
            } catch (e) {
                if (i === MAX_RETRIES) {
                    logger.error('! Database connection failed after maximum retries', e.message);
                } else {
                    logger.warn(`! Database connection attempt ${i} failed. Retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        // 3. Redis connection
        try {
            await redis.ping();
            logger.info('✓ Redis connected');
            systemStatus.redis = true;
        } catch (e) {
            logger.error('! Redis connection failed', e.message);
        }

        // 4. Post-connection background initialization
        if (systemStatus.db) {
            assignmentScheduler.start(io);
            nightlySweeper.start();
            
            // Start B2B Background Worker
            const b2bWorker = new B2BWorker(app);
            b2bWorker.start();
            
            try {
                logger.info('Synchronizing Pricing Matrix to RAM...');
                await pricingCache.init();
                logger.info('✓ Pricing Matrix ready.');
            } catch (cacheError) {
                logger.error('! Failed to load pricing matrix:', cacheError.message);
            }

            // ────────────────────────────────────────────────────────────────────
            // QUARANTINE JANITOR — runs every 15 minutes
            // Auto-rejects any needs_review_price booking older than 2 hours.
            // Rule: cheap tours that no admin rescued within the window get killed.
            // ────────────────────────────────────────────────────────────────────
            const JANITOR_INTERVAL_MS  = 15 * 60 * 1000; // 15 minutes
            const QUARANTINE_EXPIRY_MS = 2  * 60 * 60 * 1000; // 2 hours

            const runQuarantineJanitor = async () => {
                try {
                    const expiryThreshold = new Date(Date.now() - QUARANTINE_EXPIRY_MS);

                    // Find all expired quarantined tours
                    const expired = await db.query(
                        `SELECT id, booking_reference, tenant_id
                         FROM bookings
                         WHERE status = 'needs_review_price'
                           AND created_at < $1`,
                        [expiryThreshold]
                    );

                    if (expired.rows.length === 0) {
                        logger.info('[JANITOR] No expired quarantine tours found.');
                        return;
                    }

                    logger.warn(`[JANITOR] Expiring ${expired.rows.length} quarantined tours older than 2 hours.`);

                    for (const booking of expired.rows) {
                        try {
                            await db.query(
                                `UPDATE bookings
                                 SET status        = 'rejected',
                                     admin_notes   = 'Quarantine Expired — auto-rejected by system after 2 hours',
                                     updated_at    = NOW()
                                 WHERE id = $1`,
                                [booking.id]
                            );

                            // Audit log — non-fatal
                            await db.query(
                                `INSERT INTO assignment_logs (booking_id, driver_id, event_type, reason)
                                 VALUES ($1, NULL, 'system_action', 'Quarantine Expired')`,
                                [booking.id]
                            ).catch(() => {});

                            logger.info(`[JANITOR] ❌ Expired: Booking ${booking.booking_reference} (id=${booking.id})`);
                        } catch (innerErr) {
                            logger.error(`[JANITOR] Failed to expire booking ${booking.id}:`, innerErr.message);
                        }
                    }

                    // Broadcast to admin dashboard so the Quarantine counter updates
                    if (io) {
                        io.to('admins').emit('bookings_updated', {
                            action: 'quarantine_sweep',
                            expired: expired.rows.length
                        });
                    }

                    logger.info(`[JANITOR] Sweep complete. ${expired.rows.length} tours rejected.`);
                } catch (err) {
                    logger.error('[JANITOR] Quarantine sweep failed:', err.message);
                }
            };

            // Run immediately on startup to catch any backlog, then every 15 min
            runQuarantineJanitor();
            const janitorTimer = setInterval(runQuarantineJanitor, JANITOR_INTERVAL_MS);
            logger.info(`✓ Quarantine Janitor started (sweep every 15 min, 2hr expiry).`);

            // Ensure the timer doesn't block shutdown
            process.once('beforeExit', () => clearInterval(janitorTimer));

        } else {
            logger.warn('⚠️ Server started in DEGRADED MODE (No Database). Pricing API will fail.');
        }

    } catch (error) {
        logger.error('Critical failure during post-listen initialization:', error);
    }
}


// Handle graceful shutdown — releases DB pool, Redis, and unbinds the port
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully...`);

  // Force-kill after 10 s if connections won't close
  const forceExit = setTimeout(() => {
    logger.error('Could not close connections in time — forcefully shutting down');
    process.exit(1);
  }, 10000);
  forceExit.unref(); // Don't let this timer keep the process alive

  server.close(async () => {
    try {
      assignmentScheduler.stop();
      nightlySweeper.stop();
      await db.destroy();   // Release PostgreSQL connection pool
      await redis.quit();   // Release Redis connection
      logger.info('Server shut down complete — port released');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown cleanup', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server only if run directly
if (require.main === module) {
  startServer();
}


