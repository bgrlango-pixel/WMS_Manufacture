/**
 * CQRS COMMAND SERVICE (Node.js)
 * Handles: POST, PUT, DELETE operations only
 */
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'ERP Command Service',
        timestamp: new Date().toISOString()
    });
});

// Service info endpoint
app.get('/info', (req, res) => {
    res.json({
        service: 'ERP Command Service',
        version: '2.0.0',
        description: 'Write operations for Manufacturing ERP'
    });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});