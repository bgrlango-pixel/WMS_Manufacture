const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'WMS Manufacturing Command Service' });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'WMS Manufacturing Command Service',
        version: '1.0.0'
    });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});