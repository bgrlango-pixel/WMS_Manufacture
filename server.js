/**
 * CQRS COMMAND SERVICE (Node.js)
 * Manufacturing WMS/ERP System
 * Handles: POST, PUT, DELETE, PATCH operations only
 * Port: 3108 (Development) / 8080 (Cloud Run)
 */

// Core dependencies
const express = require('express');
const cors = require('cors');
const { Sequelize } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Middleware imports
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables
require('dotenv').config();

// Initialize Express app
const app = express();

// Database configuration
const sequelize = new Sequelize(
    process.env.DB_NAME || 'wms_manufacture',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CQRS Middleware - Enforce Command-side operations only
app.use((req, res, next) => {
    if (req.method === 'GET' && 
        !req.path.includes('/health') && 
        !req.path.includes('/info')) {
        return res.status(405).json({
            error: 'Method Not Allowed',
            message: 'GET operations should use Query Service on port 2025',
            queryServiceUrl: `http://localhost:2025${req.path}`,
            pattern: 'CQRS Separation'
        });
    }
    next();
});

// Audit logging middleware
app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded;
                // Log to user_log table
                sequelize.models.UserLog.create({
                    id_user: decoded.id,
                    email: decoded.email,
                    logs_status: `${req.method} ${req.path}`,
                    ip_address: req.ip,
                    user_agent: req.headers['user-agent']
                });
            } catch (error) {
                console.error('JWT verification failed:', error);
            }
        }
    }
    next();
});

// Import routes
const productionRoutes = require('./routes/productionRoutes');
const qualityControlRoutes = require('./routes/qualityControlRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const warehouseRoutes = require('./routes/warehouseRoutes');

// Register routes
app.use('/api/command/production', productionRoutes);
app.use('/api/command/quality-control', qualityControlRoutes);
app.use('/api/command/inventory', inventoryRoutes);
app.use('/api/command/warehouse', warehouseRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'WMS Manufacturing Command Service',
        version: '2.0.0',
        pattern: 'CQRS - Command Side',
        timestamp: new Date().toISOString(),
        database: sequelize.authenticate()
            .then(() => 'connected')
            .catch(() => 'disconnected')
    });
});

// Service info endpoint
app.get('/info', (req, res) => {
    res.json({
        service: 'WMS Manufacturing Command Service',
        version: '2.0.0',
        pattern: 'CQRS Architecture',
        operations: {
            allowed: ['POST', 'PUT', 'PATCH', 'DELETE'],
            blocked: ['GET (use Query Service)']
        },
        features: [
            'Production Tracking with Job Orders',
            'Quality Control (OQC & NCR)',
            'Multi-location Inventory Management',
            'Warehouse Operations (Delivery & Returns)'
        ],
        requirements: [
            'Lot Number Tracking',
            'Transaction Management (ACID)',
            'User Activity Logging'
        ]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
        path: req.path
    });
});

// Start server
const PORT = process.env.PORT || 8080;

sequelize.authenticate()
    .then(() => {
        console.log('✅ Database connection established');
        app.listen(PORT, () => {
            console.log(`🚀 Command Service running on port ${PORT}`);
            console.log('📝 Accepting: POST, PUT, PATCH, DELETE');
            console.log('🔄 Pattern: CQRS - Command Side');
            console.log('🏭 System: WMS Manufacturing');
        });
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    });