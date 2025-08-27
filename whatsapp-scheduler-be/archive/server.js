const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { findGroupByName, isUserAdmin } = require('../utils');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// WhatsApp Client Setup
let client;
let isClientReady = false;
let isInitializing = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;
let currentQrCode = null; // Store current QR code for API access

const initializeClient = async () => {
    if (isInitializing) {
        console.log('⏳ Client initialization already in progress...');
        return;
    }

    if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
        console.log('❌ Maximum initialization attempts reached. Please restart the server.');
        return;
    }

    isInitializing = true;
    initializationAttempts++;

    try {
        console.log(`🔄 Initializing WhatsApp client (attempt ${initializationAttempts}/${MAX_INIT_ATTEMPTS})...`);

        // Clean up existing client if any
        if (client) {
            try {
                await client.destroy();
            } catch (error) {
                console.log('⚠️ Error destroying previous client:', error.message);
            }
        }

        client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'whatsapp-bot'
            }),
            puppeteer: {
                headless: true,
                executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        // Set up event handlers
        client.on('qr', (qr) => {
            console.log('📱 QR Code received. Please scan with WhatsApp.');
            currentQrCode = qr; // Store QR code for API access
            qrcode.generate(qr, { small: true });
            console.log('📱 Scan the QR code above to log in');
        });

        client.on('ready', () => {
            console.log('✅ WhatsApp Client is ready!');
            isClientReady = true;
            isInitializing = false;
            initializationAttempts = 0; // Reset on success
            currentQrCode = null; // Clear QR code when connected
        });

        client.on('authenticated', () => {
            console.log('🔐 WhatsApp Client authenticated successfully');
        });

        client.on('auth_failure', (msg) => {
            console.log('❌ Authentication failed:', msg);
            isClientReady = false;
            isInitializing = false;
            // Retry after a delay
            setTimeout(() => {
                console.log('🔄 Retrying authentication...');
                initializeClient();
            }, 5000);
        });

        client.on('disconnected', (reason) => {
            console.log('❌ Client disconnected:', reason);
            isClientReady = false;
            isInitializing = false;

            // Auto-reconnect after disconnection
            setTimeout(() => {
                console.log('🔄 Attempting to reconnect...');
                initializeClient();
            }, 10000);
        });

        client.on('loading_screen', (percent, message) => {
            console.log(`⏳ Loading: ${percent}% - ${message}`);
        });

        // Add error handler
        client.on('error', (error) => {
            console.error('❌ WhatsApp Client Error:', error);
            isClientReady = false;
            isInitializing = false;
        });

        // Initialize the client
        await client.initialize();

    } catch (error) {
        console.error('❌ Failed to initialize WhatsApp client:', error);
        isClientReady = false;
        isInitializing = false;

        // Retry after a delay if we haven't exceeded max attempts
        if (initializationAttempts < MAX_INIT_ATTEMPTS) {
            setTimeout(() => {
                console.log('🔄 Retrying client initialization...');
                initializeClient();
            }, 10000);
        }
    }
};

// Start server first
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);

    // Initialize WhatsApp client after server starts
    setTimeout(async () => {
        try {
            await initializeClient();
        } catch (error) {
            console.error('❌ Failed to start WhatsApp client:', error);
        }
    }, 2000);
});

// Add comprehensive error handling
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please stop other processes or use a different port.`);
        process.exit(1);
    } else {
        console.error('❌ Server error:', err);
    }
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
    console.log('\n🔄 Gracefully shutting down...');

    if (client && isClientReady) {
        try {
            await client.destroy();
            console.log('✅ WhatsApp client disconnected');
        } catch (error) {
            console.log('⚠️ Error disconnecting WhatsApp client:', error.message);
        }
    }

    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', async () => {
    console.log('🔄 Received SIGTERM, shutting down gracefully...');

    if (client && isClientReady) {
        try {
            await client.destroy();
        } catch (error) {
            console.log('⚠️ Error disconnecting WhatsApp client:', error.message);
        }
    }

    server.close(() => {
        process.exit(0);
    });
});

// Helper function to load schedule data
const loadScheduleData = () => {
    try {
        const data = fs.readFileSync('./schedule.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

// Helper function to save schedule data
const saveScheduleData = (data) => {
    fs.writeFileSync('./schedule.json', JSON.stringify(data, null, 2));
};

const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        whatsappReady: isClientReady,
        timestamp: new Date().toISOString()
    });
});

// Get WhatsApp connection status
app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        isReady: isClientReady,
        clientInfo: isClientReady ? client.info : null
    });
});

// Get QR code for WhatsApp authentication
app.get('/api/whatsapp/qr', async (req, res) => {
    if (isClientReady) {
        return res.json({
            hasQr: false,
            message: 'WhatsApp is already connected'
        });
    }

    if (currentQrCode) {
        try {
            // Generate QR code as data URL for frontend display
            const qrDataUrl = await QRCode.toDataURL(currentQrCode, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return res.json({
                hasQr: true,
                qrCode: currentQrCode,
                qrDataUrl: qrDataUrl
            });
        } catch (error) {
            console.error('Error generating QR code image:', error);
            return res.json({
                hasQr: true,
                qrCode: currentQrCode
            });
        }
    }

    res.json({
        hasQr: false,
        message: isInitializing ? 'Initializing WhatsApp client...' : 'No QR code available. Please restart the connection.'
    });
});

// Send immediate message
app.post('/api/messages/send', upload.array('images', 5), async (req, res) => {
    try {
        const { groupName, message } = req.body;

        // Validation
        if (!groupName || !message) {
            return res.status(400).json({
                error: 'groupName and message are required'
            });
        }

        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp client is not ready. Please try again later.'
            });
        }

        // Find the group
        const group = await findGroupByName(client, groupName);
        if (!group) {
            return res.status(404).json({
                error: `Group "${groupName}" not found`
            });
        }



        console.log('Admin check bypassed for testing')


        // Send the message
        await group.sendMessage(message);

        res.json({
            success: true,
            message: 'Message sent successfully',
            groupName,
            sentAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            error: 'Failed to send message',
            details: error.message
        });
    }
});

// Schedule a message
app.post('/api/messages/schedule', upload.array('images', 5), async (req, res) => {
    try {
        const { groupName, message, cronTime, description, endDate, maxOccurrences } = req.body;

        // Validation
        if (!groupName || !message || !cronTime) {
            return res.status(400).json({
                error: 'groupName, message, and cronTime are required'
            });
        }

        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp client is not ready. Please try again later.'
            });
        }

        // Validate cron expression
        if (!cron.validate(cronTime)) {
            return res.status(400).json({
                error: 'Invalid cron expression'
            });
        }

        // Validate end date if provided
        let endDateTime = null;
        if (endDate) {
            endDateTime = new Date(endDate);
            if (isNaN(endDateTime.getTime())) {
                return res.status(400).json({
                    error: 'Invalid endDate format. Use ISO string format (e.g., "2024-12-31T23:59:59.000Z")'
                });
            }
            if (endDateTime <= new Date()) {
                return res.status(400).json({
                    error: 'endDate must be in the future'
                });
            }
        }

        // Validate maxOccurrences if provided
        if (maxOccurrences !== undefined && (typeof maxOccurrences !== 'number' || maxOccurrences <= 0)) {
            return res.status(400).json({
                error: 'maxOccurrences must be a positive number'
            });
        }

        // Find the group
        const group = await findGroupByName(client, groupName);
        if (!group) {
            return res.status(404).json({
                error: `Group "${groupName}" not found`
            });
        }

        const currentUser = client.info.wid._serialized;
        console.log(`Logged in as: ${currentUser}`);

        // Load existing schedule data
        const scheduleData = loadScheduleData();

        // Create new scheduled task
        const newTask = {
            id: Date.now().toString(),
            groupName,
            message,
            cron: cronTime,
            description: description || '',
            endDate: endDateTime ? endDateTime.toISOString() : null,
            maxOccurrences: maxOccurrences || null,
            currentOccurrences: 0,
            createdAt: new Date().toISOString(),
            createdBy: currentUser
        };

        // Add to schedule data
        scheduleData.push(newTask);
        saveScheduleData(scheduleData);

        // Schedule the cron job with limits check
        cron.schedule(cronTime, async () => {
            try {
                // Load current schedule data to get updated occurrence count
                const currentScheduleData = loadScheduleData();
                const currentTask = currentScheduleData.find(task => task.id === newTask.id);

                if (!currentTask) {
                    console.log(`⚠️ Scheduled task ${newTask.id} not found, stopping execution`);
                    return;
                }

                // Check if the schedule has expired by end date
                if (endDateTime && new Date() > endDateTime) {
                    console.log(`⏰ Scheduled message for "${groupName}" has expired (end date reached) and will be removed`);
                    const filteredData = currentScheduleData.filter(task => task.id !== newTask.id);
                    saveScheduleData(filteredData);
                    return;
                }

                // Check if max occurrences reached
                if (maxOccurrences && currentTask.currentOccurrences >= maxOccurrences) {
                    console.log(`🔢 Scheduled message for "${groupName}" has reached max occurrences (${maxOccurrences}) and will be removed`);
                    const filteredData = currentScheduleData.filter(task => task.id !== newTask.id);
                    saveScheduleData(filteredData);
                    return;
                }

                const group = await findGroupByName(client, groupName);
                if (group) {
                    await group.sendMessage(message);
                    console.log(`✅ Scheduled message sent to "${groupName}" at ${new Date().toLocaleString()} (occurrence ${currentTask.currentOccurrences + 1}${maxOccurrences ? `/${maxOccurrences}` : ''})`);

                    // Update occurrence count
                    currentTask.currentOccurrences += 1;
                    saveScheduleData(currentScheduleData);
                }
            } catch (error) {
                console.error(`Error sending scheduled message to "${groupName}":`, error.message);
            }
        });

        res.json({
            success: true,
            message: 'Message scheduled successfully',
            task: newTask
        });

    } catch (error) {
        console.error('Error scheduling message:', error);
        res.status(500).json({
            error: 'Failed to schedule message',
            details: error.message
        });
    }
});

// Get all scheduled messages
app.get('/api/messages/scheduled', (req, res) => {
    try {
        const scheduleData = loadScheduleData();
        res.json({
            success: true,
            scheduledMessages: scheduleData
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch scheduled messages',
            details: error.message
        });
    }
});

// Delete a scheduled message
app.delete('/api/messages/scheduled/:id', (req, res) => {
    try {
        const { id } = req.params;
        const scheduleData = loadScheduleData();

        const filteredData = scheduleData.filter(task => task.id !== id);

        if (filteredData.length === scheduleData.length) {
            return res.status(404).json({
                error: 'Scheduled message not found'
            });
        }

        saveScheduleData(filteredData);

        res.json({
            success: true,
            message: 'Scheduled message deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to delete scheduled message',
            details: error.message
        });
    }
});

// Get available groups
app.get('/api/groups', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp client is not ready'
            });
        }

        const chats = await client.getChats();
        const groups = chats
            .filter(chat => chat.isGroup)
            .map(group => ({
                id: group.id._serialized,
                name: group.name,
                participantCount: group.participants ? group.participants.length : 0
            }));

        res.json({
            success: true,
            groups
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch groups',
            details: error.message
        });
    }
});

// Add file upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
        message: 'File uploaded successfully',
        filename: req.file.filename,
        path: req.file.path
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

// Server is now started above after client initialization

// Graceful shutdown handlers
process.on('SIGINT', async () => {
    console.log('\n🔄 Gracefully shutting down...');
    if (client) {
        await client.destroy();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Gracefully shutting down...');
    if (client) {
        await client.destroy();
    }
    process.exit(0);
});

module.exports = app;