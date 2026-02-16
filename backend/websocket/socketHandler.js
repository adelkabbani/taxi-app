const logger = require('../config/logger');

/**
 * Socket.io event handlers for real-time updates
 */
module.exports = (io) => {
    // Connection event
    io.on('connection', (socket) => {
        logger.info('Client connected', {
            socketId: socket.id,
            transport: socket.conn.transport.name
        });

        // Authentication (clients should send auth token)
        socket.on('authenticate', (data) => {
            const { token, userId, role } = data;

            // TODO: Verify JWT token here
            socket.userId = userId;
            socket.userRole = role;

            // Join user-specific room
            socket.join(`user:${userId}`);

            // Join role-specific rooms
            if (role === 'admin') {
                socket.join('admins');
            } else if (role === 'driver') {
                socket.join('drivers');
            }

            // Join tenant room
            if (data.tenantId) {
                socket.join(`tenant:${data.tenantId}`);
            }

            logger.info('Socket authenticated', {
                socketId: socket.id,
                userId,
                role
            });

            socket.emit('authenticated', { success: true });
        });

        // Driver location update
        socket.on('location_update', (data) => {
            const { lat, lng, accuracy, heading, speed } = data;

            if (socket.userRole !== 'driver') {
                return socket.emit('error', { message: 'Not authorized' });
            }

            // Broadcast to admins
            io.to('admins').emit('driver_location', {
                driverId: socket.userId,
                lat,
                lng,
                accuracy,
                heading,
                speed,
                timestamp: new Date().toISOString()
            });
        });

        // Booking status update
        socket.on('booking_status_update', (data) => {
            const { bookingId, status } = data;

            // Broadcast to relevant parties
            io.to(`booking:${bookingId}`).emit('booking_updated', {
                bookingId,
                status,
                timestamp: new Date().toISOString()
            });

            // Also broadcast to admins
            io.to('admins').emit('booking_updated', {
                bookingId,
                status,
                timestamp: new Date().toISOString()
            });
        });

        // Join booking room (for real-time updates on specific booking)
        socket.on('join_booking', (bookingId) => {
            socket.join(`booking:${bookingId}`);
            logger.info('Socket joined booking room', {
                socketId: socket.id,
                bookingId
            });
        });

        // Leave booking room
        socket.on('leave_booking', (bookingId) => {
            socket.leave(`booking:${bookingId}`);
            logger.info('Socket left booking room', {
                socketId: socket.id,
                bookingId
            });
        });

        // Disconnect
        socket.on('disconnect', (reason) => {
            logger.info('Client disconnected', {
                socketId: socket.id,
                userId: socket.userId,
                reason
            });
        });

        // Error handling
        socket.on('error', (error) => {
            logger.error('Socket error', {
                socketId: socket.id,
                error: error.message
            });
        });
    });

    // Broadcast booking created event
    io.broadcastBookingCreated = (booking) => {
        io.to('admins').emit('booking_created', booking);
        io.to('drivers').emit('new_booking_available', {
            bookingId: booking.id,
            pickup: booking.pickup_address
        });
    };

    // Broadcast driver assignment
    io.broadcastDriverAssigned = (bookingId, driverId) => {
        io.to(`user:${driverId}`).emit('booking_assigned', { bookingId });
        io.to(`booking:${bookingId}`).emit('driver_assigned', { driverId });
        io.to('admins').emit('booking_updated', {
            bookingId,
            status: 'assigned',
            driverId
        });
    };

    // Broadcast no-show alert
    io.broadcastNoShowAlert = (bookingId, driverId) => {
        io.to('admins').emit('no_show_alert', {
            bookingId,
            driverId,
            timestamp: new Date().toISOString()
        });
    };

    // Broadcast location staleness warning
    io.broadcastLocationStale = (driverId) => {
        io.to('admins').emit('driver_location_stale', {
            driverId,
            timestamp: new Date().toISOString()
        });
    };

    // --- AUTO-ASSIGNMENT EVENTS ---

    // Notify driver of specific assignment
    io.broadcastAutoAssignment = (driverUserId, bookingData) => {
        io.to(`user:${driverUserId}`).emit('new_booking_assignment', {
            ...bookingData,
            notification_type: 'auto_assigned'
        });
    };

    // Notify admins of success
    io.broadcastAssignmentSuccess = (tenantId, assignmentData) => {
        io.to(`tenant:${tenantId}`).to('admins').emit('auto_assignment_success', assignmentData);
    };

    // Notify admins of failure
    io.broadcastAssignmentFailed = (tenantId, failureData) => {
        io.to(`tenant:${tenantId}`).to('admins').emit('auto_assignment_failed', failureData);
    };

    logger.info('Socket.io handlers initialized');
};
