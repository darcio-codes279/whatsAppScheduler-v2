const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock WhatsApp state
let isClientReady = false;
let currentQrCode = 'mock-qr-code-for-testing';

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        whatsapp: {
            connected: isClientReady,
            ready: isClientReady
        }
    });
});

// WhatsApp status endpoint
app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        isConnected: isClientReady,
        isReady: isClientReady,
        clientInfo: isClientReady ? {
            pushname: 'Test User',
            wid: {
                user: 'testuser',
                server: 'c.us'
            }
        } : null
    });
});

// QR code endpoint
app.get('/api/whatsapp/qr', (req, res) => {
    if (isClientReady) {
        return res.json({
            hasQr: false,
            message: 'WhatsApp is already connected'
        });
    }

    res.json({
        hasQr: true,
        qrCode: currentQrCode,
        message: 'QR code available for testing'
    });
});

// Groups endpoint
app.get('/api/whatsapp/groups', (req, res) => {
    if (!isClientReady) {
        return res.status(400).json({
            error: 'WhatsApp client not connected'
        });
    }

    // Mock groups data
    res.json([
        {
            id: 'group1@g.us',
            name: 'Test Group 1',
            memberCount: 5
        },
        {
            id: 'group2@g.us',
            name: 'Test Group 2',
            memberCount: 10
        }
    ]);
});

// Connect endpoint (for testing)
app.post('/api/whatsapp/connect', (req, res) => {
    setTimeout(() => {
        isClientReady = true;
        currentQrCode = null;
        console.log('✅ Mock WhatsApp connection established');
    }, 2000);

    res.json({
        message: 'Connection initiated'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        details: error.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Test API Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📱 QR endpoint: http://localhost:${PORT}/api/whatsapp/qr`);
    console.log(`🔗 Connect endpoint: http://localhost:${PORT}/api/whatsapp/connect`);
});

module.exports = app;