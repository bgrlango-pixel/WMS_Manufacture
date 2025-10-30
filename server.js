/**
 * CQRS COMMAND SERVICE (Node.js)
 * Manufacturing WMS/ERP System - Command Service
 */

const express = require('express');
const cors = require('cors');

// Initialize Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Basic Routes
app.post('/api/command/production', (req, res) => {
    res.json({
        message: 'Production command received',
        data: req.body,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/command/inventory', (req, res) => {
    res.json({
        message: 'Inventory command received',
        data: req.body,
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'WMS Manufacturing Command Service',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Service info endpoint
app.get('/info', (req, res) => {
    res.json({
        service: 'WMS Manufacturing Command Service',
        version: '1.0.0',
        description: 'Write operations for Manufacturing WMS',
        endpoints: {
            production: '/api/command/production',
            inventory: '/api/command/inventory'
        }
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'Something went wrong'
    });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});