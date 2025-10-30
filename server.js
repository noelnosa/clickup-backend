const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

app.use(cors({
    origin: [
        'https://mail.missiveapp.com',
        'https://integrations.missiveapp.com',
        /\.missiveapp\.com$/,
        'http://localhost:3000',
    ],
    credentials: true
}));

app.use(express.json());

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

app.all('/api/clickup/*', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing authorization header' });
        }
        
        const clickupPath = req.params[0];
        const queryString = new URLSearchParams(req.query).toString();
        const clickupUrl = `${CLICKUP_API_BASE}/${clickupPath}${queryString ? '?' + queryString : ''}`;
        
        console.log(`${new Date().toISOString()} - ${req.method} ${clickupUrl}`);
        
        const options = {
            method: req.method,
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        };
        
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
            options.body = JSON.stringify(req.body);
        }
        
        const response = await fetch(clickupUrl, options);
        const responseText = await response.text();
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Non-JSON response:', responseText.substring(0, 200));
            return res.status(response.status).json({
                error: 'Invalid response from ClickUp API',
                status: response.status,
                message: responseText.substring(0, 500)
            });
        }
        
        if (!response.ok) {
            console.error(`ClickUp API Error ${response.status}:`, data);
        }
        
        res.status(response.status).json(data);
        
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ 
            error: error.message,
            type: 'ProxyError'
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'ClickUp proxy is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✓ ClickUp API proxy running on port ${PORT}`);
});
