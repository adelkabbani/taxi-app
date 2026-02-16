const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const redis = require('../config/redis');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const rateLimiter = require('../middleware/rateLimiter');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get token
 * @access  Public
 */
router.post('/login',
    // rateLimiter.auth, // DISABLED FOR DEV
    [
        body('email').optional().isEmail(),
        body('phone').optional().isMobilePhone(),
        body('password').notEmpty().withMessage('Password is required')
    ],
    asyncHandler(async (req, res) => {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new AppError('Validation failed', 400);
        }

        const { email, phone, password } = req.body;

        // Must provide either email or phone
        if (!email && !phone) {
            throw new AppError('Email or phone number required', 400);
        }

        // Find user
        let query, params;
        if (email) {
            query = 'SELECT * FROM users WHERE email = $1 AND status = $2';
            params = [email, 'active'];
        } else {
            query = 'SELECT * FROM users WHERE phone = $1 AND status = $2';
            params = [phone, 'active'];
        }

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            throw new AppError('Invalid credentials', 401);
        }

        const user = result.rows[0];

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            throw new AppError('Invalid credentials', 401);
        }

        // Generate tokens
        const token = generateToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // Store refresh token in Redis
        await redis.setex(`refresh_token:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

        // Log successful login
        logger.info('User logged in', {
            userId: user.id,
            role: user.role,
            email: user.email
        });

        // Return response (don't send password hash!)
        res.json({
            success: true,
            data: {
                token,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role
                }
            }
        });
    })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh',
    asyncHandler(async (req, res) => {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new AppError('Refresh token required', 400);
        }

        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

            // Check if refresh token exists in Redis
            const storedToken = await redis.get(`refresh_token:${decoded.id}`);

            if (storedToken !== refreshToken) {
                throw new AppError('Invalid refresh token', 401);
            }

            // Generate new access token
            const token = generateToken(decoded.id);

            res.json({
                success: true,
                data: { token }
            });

        } catch (error) {
            throw new AppError('Invalid or expired refresh token', 401);
        }
    })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout',
    asyncHandler(async (req, res) => {
        const { userId } = req.body;

        if (userId) {
            // Remove refresh token from Redis
            await redis.del(`refresh_token:${userId}`);
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    })
);

/**
 * @route   POST /api/auth/register
 * @desc    Register new user (admin only in production)
 * @access  Public (should be protected in production)
 */
router.post('/register',
    [
        body('email').optional().isEmail(),
        body('phone').isMobilePhone(),
        body('password').isLength({ min: 6 }),
        body('firstName').notEmpty(),
        body('lastName').notEmpty(),
        body('role').isIn(['admin', 'driver', 'passenger'])
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new AppError('Validation failed', 400);
        }

        const { email, phone, password, firstName, lastName, role } = req.body;
        const tenantId = req.body.tenantId || parseInt(process.env.DEFAULT_TENANT_ID) || 1;

        // Check if user exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE (email = $1 OR phone = $2) AND tenant_id = $3',
            [email, phone, tenantId]
        );

        if (existingUser.rows.length > 0) {
            throw new AppError('User already exists', 400);
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const result = await db.query(
            `INSERT INTO users (tenant_id, role, email, phone, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, phone, first_name, last_name, role`,
            [tenantId, role, email, phone, passwordHash, firstName, lastName]
        );

        const user = result.rows[0];

        // Generate token
        const token = generateToken(user.id);

        logger.info('New user registered', {
            userId: user.id,
            role: user.role
        });

        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role
                }
            }
        });
    })
);

module.exports = router;
