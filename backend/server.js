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
const db = require('./config/database');
const redis = require('./config/redis');
const logger = require('./config/logger');

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
const assignmentScheduler = require('./workers/assignmentScheduler');

// Integration routes (external partners)
const welcomePickupsRoutes = require('./routes/integrations/welcomePickups');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io for real-time updates
const io = new Server(server, {
  cors: {
    origin: process.env.ADMIN_WEB_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
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
  origin: process.env.ADMIN_WEB_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Authentication routes
app.use('/api/auth', authRoutes);

app.get('/api/settings-test', (req, res) => {
  res.json({ message: 'API is reachable' });
});

// Protected routes (require authentication)
app.use('/api/bookings', authMiddleware.protect, bookingRoutes);
app.use('/api/drivers', authMiddleware.protect, driverRoutes);
app.use('/api/partners', authMiddleware.protect, authMiddleware.restrictTo('admin'), partnerRoutes);
app.use('/api/evidence', authMiddleware.protect, evidenceRoutes);
app.use('/api/invoices', authMiddleware.protect, invoiceRoutes);
app.use('/api/stats', authMiddleware.protect, statsRoutes);
app.use('/api/documents', authMiddleware.protect, documentsRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/driver-schedules', driverScheduleRoutes);

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
  try {
    // Test database connection
    try {
      await db.raw('SELECT 1');
      logger.info('✓ Database connected');
      systemStatus.db = true;
    } catch (e) {
      logger.error('! Database connection failed (Server running in degraded mode)', e.message);
    }

    // Test Redis connection
    try {
      await redis.ping();
      logger.info('✓ Redis connected');
      systemStatus.redis = true;
    } catch (e) {
      logger.error('! Redis connection failed', e.message);
    }

    // Start server regardless of DB status
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`✓ Server running on port ${PORT}`);
      logger.info(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`✓ API Base URL: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}`);

      if (!systemStatus.db) {
        logger.warn('WARNING: Server started without Database connection. API will return errors.');
      } else {
        // Start background workers only if DB is up
        assignmentScheduler.start();
      }
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    // process.exit(1); // Never crash, let the user see the logs
  }
}


// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await db.destroy();
    await redis.quit();
    assignmentScheduler.stop();
    logger.info('Server shut down complete');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await db.destroy();
    await redis.quit();
    assignmentScheduler.stop();
    logger.info('Server shut down complete');
    process.exit(0);
  });
});

// Start the server only if run directly
if (require.main === module) {
  startServer();
}


