const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const { findGroupByName, isUserAdmin } = require('./utils');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// WhatsApp Client Setup
let client = null;
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

        // Only destroy client if it exists and is not ready (to preserve authentication)
        if (client && !isClientReady) {
            try {
                console.log('🧹 Cleaning up previous failed client...');
                await client.destroy();
            } catch (error) {
                console.log('⚠️ Error destroying previous client:', error.message);
            }
        } else if (client && isClientReady) {
            console.log('✅ Client already exists and is ready, skipping initialization');
            isInitializing = false;
            return;
        }

        client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'whatsapp-bot'
            }),
            puppeteer: {
                headless: true,
                timeout: 120000,
                executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ]
            }
        });

        console.log('🔧 WhatsApp client configured with Chrome executable');

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
            currentQrCode = null;
            // Only retry if we haven't exceeded max attempts
            if (initializationAttempts < MAX_INIT_ATTEMPTS) {
                setTimeout(() => {
                    console.log('🔄 Retrying authentication...');
                    initializeClient();
                }, 5000);
            } else {
                console.log('❌ Max authentication attempts reached. Manual restart required.');
            }
        });

        client.on('disconnected', (reason) => {
            console.log('❌ Client disconnected:', reason);
            isClientReady = false;
            isInitializing = false;
            currentQrCode = null;

            // Auto-reconnect after disconnection, but preserve authentication
            if (reason !== 'LOGOUT') {
                setTimeout(() => {
                    console.log('🔄 Attempting to reconnect (preserving authentication)...');
                    initializeClient();
                }, 10000);
            } else {
                console.log('🚪 User logged out, authentication cleared');
            }
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

// Logout endpoint to clear authentication
app.post('/api/whatsapp/logout', async (req, res) => {
    try {
        if (client) {
            console.log('🔓 Logging out from WhatsApp...');
            await client.logout();
            isClientReady = false;
            currentQrCode = null;
            console.log('✅ Successfully logged out from WhatsApp');
            res.json({ success: true, message: 'Successfully logged out from WhatsApp' });
        } else {
            res.json({ success: false, error: 'No active WhatsApp session to logout from' });
        }
    } catch (error) {
        console.error('❌ Error during logout:', error.message);
        res.json({ success: false, error: 'Failed to logout: ' + error.message });
    }
});

// Start HTTP server first
app.listen(PORT, () => {
    console.log(`🚀 API Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);

    // Initialize WhatsApp client after server is running
    setTimeout(() => {
        try {
            console.log('🔄 Attempting to initialize WhatsApp client...');
            initializeClient();
        } catch (error) {
            console.error('❌ Failed to start WhatsApp client:', error);
            console.log('🚀 Server will continue running without WhatsApp functionality');
        }
    }, 1000);

    // Set a timeout to mark server as ready even if WhatsApp fails
    setTimeout(() => {
        if (!isClientReady) {
            console.log('⚠️  WhatsApp client not ready, but server will continue running');
            console.log('💡 You can try to reconnect via /api/whatsapp/reconnect endpoint');
        }
    }, 60000); // 1 minute timeout
});

// Add QR endpoint
app.get('/api/whatsapp/qr', async (req, res) => {
    if (isClientReady) {
        return res.json({
            hasQr: false,
            message: 'WhatsApp is already connected'
        });
    }

    if (currentQrCode) {
        try {
            const qrDataUrl = await QRCode.toDataURL(currentQrCode, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                errorCorrectionLevel: 'M'
            });

            // Extract base64 data from data URL (remove "data:image/png;base64," prefix)
            const base64Data = qrDataUrl.split(',')[1];

            console.log('📱 QR Code served, base64 length:', base64Data.length);
            console.log('📱 Raw QR data preview:', currentQrCode.substring(0, 50) + '...');

            return res.json({
                hasQr: true,
                qrCode: base64Data,
                qrDataUrl: qrDataUrl,
                rawQr: currentQrCode // Include raw QR for debugging
            });
        } catch (error) {
            console.error('Error generating QR code image:', error);
            return res.json({
                hasQr: true,
                qrCode: currentQrCode
            });
        }
    }

    // If no QR code is available and client is not ready, try to reinitialize
    if (!isInitializing && !isClientReady) {
        console.log('🔄 No QR code available, attempting to reinitialize client...');
        initializeClient();
        return res.json({
            hasQr: false,
            message: 'Initializing WhatsApp client. Please try again in a few seconds.'
        });
    }

    res.json({
        hasQr: false,
        message: 'No QR code available. Client is initializing, please wait.'
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
        isConnected: isClientReady, // WhatsApp client ready means connected
        clientInfo: isClientReady ? client.info : null
    });
});

// Manual reconnect endpoint
app.post('/api/whatsapp/reconnect', (req, res) => {
    try {
        if (isClientReady) {
            return res.json({
                success: true,
                message: 'WhatsApp client is already connected'
            });
        }

        console.log('🔄 Manual reconnection attempt initiated...');
        initializeClient();

        res.json({
            success: true,
            message: 'Reconnection attempt started. Check status in a few moments.'
        });
    } catch (error) {
        console.error('❌ Manual reconnection failed:', error);
        res.status(500).json({
            error: 'Failed to initiate reconnection',
            details: error.message
        });
    }
});

// Session health check endpoint
app.get('/api/whatsapp/health', async (req, res) => {
    try {
        let sessionHealth = {
            isReady: isClientReady,
            hasClient: !!client,
            hasInfo: !!(client && client.info),
            timestamp: new Date().toISOString()
        };

        // Try to perform a simple operation to verify session is actually working
        if (isClientReady && client) {
            try {
                await client.getState();
                sessionHealth.canPerformOperations = true;
            } catch (testError) {
                sessionHealth.canPerformOperations = false;
                sessionHealth.testError = testError.message;

                // If we get a session error, mark as not ready
                if (testError.message.includes('Session closed') || testError.message.includes('Protocol error')) {
                    isClientReady = false;
                    sessionHealth.isReady = false;
                }
            }
        } else {
            sessionHealth.canPerformOperations = false;
        }

        res.json({
            success: true,
            health: sessionHealth
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to check session health',
            details: error.message
        });
    }
});

// Send immediate message
app.post('/api/messages/send', upload.array('images', 5), async (req, res) => {
    try {
        const { groupName, message } = req.body;
        const images = req.files || [];

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

        // Check if current user is admin
        const currentUser = client.info.wid._serialized;
        const isAdmin = await isUserAdmin(client, group, currentUser);

        if (!isAdmin) {
            return res.status(403).json({
                error: `You are not an admin in "${groupName}". Only admins can send messages.`
            });
        }

        // Send the message
        try {
            if (images.length > 0) {
                // Send text message first if provided
                if (message.trim()) {
                    await group.sendMessage(message);
                }

                // Send each image
                for (const image of images) {
                    const media = MessageMedia.fromFilePath(image.path);
                    await group.sendMessage(media);

                    // Clean up uploaded file
                    fs.unlinkSync(image.path);
                }
            } else {
                // Send text-only message
                await group.sendMessage(message);
            }
        } catch (sendError) {
            // Clean up any remaining uploaded files
            images.forEach(image => {
                if (fs.existsSync(image.path)) {
                    fs.unlinkSync(image.path);
                }
            });

            // Check if it's a session disconnection error
            if (sendError.message.includes('Session closed') || sendError.message.includes('Protocol error')) {
                isClientReady = false;
                throw new Error('WhatsApp session disconnected. Please wait for reconnection and try again.');
            }
            throw sendError;
        }

        res.json({
            success: true,
            message: `Message sent successfully${images.length > 0 ? ` with ${images.length} image(s)` : ''}`,
            groupName,
            sentAt: new Date().toISOString(),
            imageCount: images.length
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
        const { groupName, message, cronTime, description } = req.body;
        const images = req.files || [];

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

        // Check if client session is still valid before proceeding
        try {
            if (!client || !client.info) {
                throw new Error('WhatsApp session is not available');
            }
        } catch (sessionError) {
            console.error('Session validation failed:', sessionError.message);
            isClientReady = false;
            return res.status(503).json({
                error: 'WhatsApp session disconnected. Please wait for reconnection and try again.',
                details: sessionError.message
            });
        }

        // Find the group with error handling
        let group;
        try {
            group = await findGroupByName(client, groupName);
            if (!group) {
                return res.status(404).json({
                    error: `Group "${groupName}" not found`
                });
            }
        } catch (groupError) {
            console.error('Error finding group:', groupError.message);
            if (groupError.message.includes('Session closed') || groupError.message.includes('Protocol error')) {
                isClientReady = false;
                return res.status(503).json({
                    error: 'WhatsApp session disconnected. Please wait for reconnection and try again.',
                    details: groupError.message
                });
            }
            throw groupError;
        }

        // Check if current user is admin with error handling
        let currentUser, isAdmin;
        try {
            currentUser = client.info.wid._serialized;
            isAdmin = await isUserAdmin(client, group, currentUser);

            if (!isAdmin) {
                return res.status(403).json({
                    error: `You are not an admin in "${groupName}". Only admins can schedule messages.`
                });
            }
        } catch (adminError) {
            console.error('Error checking admin status:', adminError.message);
            if (adminError.message.includes('Session closed') || adminError.message.includes('Protocol error')) {
                isClientReady = false;
                return res.status(503).json({
                    error: 'WhatsApp session disconnected. Please wait for reconnection and try again.',
                    details: adminError.message
                });
            }
            throw adminError;
        }

        // Load existing schedule data
        const scheduleData = loadScheduleData();

        // Store image paths for scheduled messages
        const imagePaths = images.map(image => {
            const scheduledImagePath = path.join('./uploads/scheduled', `${Date.now()}-${image.originalname}`);
            // Create scheduled directory if it doesn't exist
            const scheduledDir = path.dirname(scheduledImagePath);
            if (!fs.existsSync(scheduledDir)) {
                fs.mkdirSync(scheduledDir, { recursive: true });
            }
            // Move file to scheduled directory
            fs.renameSync(image.path, scheduledImagePath);
            return scheduledImagePath;
        });

        // Create new scheduled task
        const newTask = {
            id: Date.now().toString(),
            groupName,
            message,
            cron: cronTime,
            description: description || '',
            createdAt: new Date().toISOString(),
            createdBy: currentUser,
            imagePaths: imagePaths
        };

        // Add status field to new task
        newTask.status = 'pending';
        newTask.lastAttempt = null;
        newTask.errorMessage = null;

        // Add to schedule data
        scheduleData.push(newTask);
        saveScheduleData(scheduleData);

        // Helper function to update message status
        const updateMessageStatus = (taskId, status, errorMessage = null) => {
            try {
                const currentScheduleData = loadScheduleData();
                const taskIndex = currentScheduleData.findIndex(task => task.id === taskId);
                if (taskIndex !== -1) {
                    currentScheduleData[taskIndex].status = status;
                    currentScheduleData[taskIndex].lastAttempt = new Date().toISOString();
                    if (errorMessage) {
                        currentScheduleData[taskIndex].errorMessage = errorMessage;
                    }
                    saveScheduleData(currentScheduleData);
                }
            } catch (updateError) {
                console.error('Error updating message status:', updateError.message);
            }
        };

        // Schedule the cron job
        cron.schedule(cronTime, async () => {
            try {
                // Check if client is still ready before executing scheduled message
                if (!isClientReady || !client || !client.info) {
                    console.log(`⚠️  WhatsApp client not ready. Skipping scheduled message to "${groupName}".`);
                    updateMessageStatus(newTask.id, 'failed', 'WhatsApp client not ready');
                    return;
                }

                let group;
                try {
                    group = await findGroupByName(client, groupName);
                } catch (groupError) {
                    if (groupError.message.includes('Session closed') || groupError.message.includes('Protocol error')) {
                        console.log(`⚠️  WhatsApp session disconnected. Skipping scheduled message to "${groupName}".`);
                        isClientReady = false;
                        updateMessageStatus(newTask.id, 'failed', 'WhatsApp session disconnected');
                        return;
                    }
                    throw groupError;
                }

                if (group) {
                    let isAdmin;
                    try {
                        isAdmin = await isUserAdmin(client, group, currentUser);
                    } catch (adminError) {
                        if (adminError.message.includes('Session closed') || adminError.message.includes('Protocol error')) {
                            console.log(`⚠️  WhatsApp session disconnected while checking admin status. Skipping scheduled message to "${groupName}".`);
                            isClientReady = false;
                            updateMessageStatus(newTask.id, 'failed', 'WhatsApp session disconnected while checking admin status');
                            return;
                        }
                        throw adminError;
                    }

                    if (isAdmin) {
                        try {
                            // Send text message first if provided
                            if (message.trim()) {
                                await group.sendMessage(message);
                            }

                            // Send images if any
                            if (imagePaths && imagePaths.length > 0) {
                                for (const imagePath of imagePaths) {
                                    if (fs.existsSync(imagePath)) {
                                        const media = MessageMedia.fromFilePath(imagePath);
                                        await group.sendMessage(media);
                                        // Clean up the scheduled image file
                                        fs.unlinkSync(imagePath);
                                    }
                                }
                            }

                            console.log(`✅ Scheduled message sent to "${groupName}" at ${new Date().toLocaleString()}${imagePaths?.length ? ` with ${imagePaths.length} image(s)` : ''}`);
                            updateMessageStatus(newTask.id, 'sent');
                        } catch (sendError) {
                            if (sendError.message.includes('Session closed') || sendError.message.includes('Protocol error')) {
                                console.log(`⚠️  WhatsApp session disconnected while sending message. Message to "${groupName}" not sent.`);
                                isClientReady = false;
                                updateMessageStatus(newTask.id, 'failed', 'WhatsApp session disconnected while sending message');
                                return;
                            }
                            throw sendError;
                        }
                    } else {
                        console.log(`❌ User no longer admin in "${groupName}". Scheduled message not sent.`);
                        updateMessageStatus(newTask.id, 'failed', 'User no longer admin in group');
                        // Clean up images if user is no longer admin
                        if (imagePaths && imagePaths.length > 0) {
                            imagePaths.forEach(imagePath => {
                                if (fs.existsSync(imagePath)) {
                                    fs.unlinkSync(imagePath);
                                }
                            });
                        }
                    }
                } else {
                    updateMessageStatus(newTask.id, 'failed', 'Group not found');
                }
            } catch (error) {
                console.error(`Error sending scheduled message to "${groupName}":`, error.message);
                updateMessageStatus(newTask.id, 'failed', error.message);
                // Clean up images on error
                if (imagePaths && imagePaths.length > 0) {
                    imagePaths.forEach(imagePath => {
                        if (fs.existsSync(imagePath)) {
                            fs.unlinkSync(imagePath);
                        }
                    });
                }
            }
        });

        res.json({
            success: true,
            message: `Message scheduled successfully${images.length > 0 ? ` with ${images.length} image(s)` : ''}`,
            task: newTask,
            imageCount: images.length
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

// Update a scheduled message
app.put('/api/messages/scheduled/:id', upload.array('images', 10), async (req, res) => {
    try {
        const { id } = req.params;
        const { groupName, message, cronTime, description } = req.body;
        const images = req.files || [];

        // Validate required fields
        if (!groupName || !message || !cronTime) {
            return res.status(400).json({
                error: 'Missing required fields: groupName, message, and cronTime are required'
            });
        }

        // Load existing schedule data
        const scheduleData = loadScheduleData();
        const taskIndex = scheduleData.findIndex(task => task.id === id);

        if (taskIndex === -1) {
            return res.status(404).json({
                error: 'Scheduled message not found'
            });
        }

        const existingTask = scheduleData[taskIndex];

        // Clean up old image files if they exist
        if (existingTask.imagePaths && existingTask.imagePaths.length > 0) {
            existingTask.imagePaths.forEach(imagePath => {
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            });
        }

        // Store new image paths for scheduled messages
        const imagePaths = images.map(image => {
            const scheduledImagePath = path.join('./uploads/scheduled', `${Date.now()}-${image.originalname}`);
            // Create scheduled directory if it doesn't exist
            const scheduledDir = path.dirname(scheduledImagePath);
            if (!fs.existsSync(scheduledDir)) {
                fs.mkdirSync(scheduledDir, { recursive: true });
            }
            // Move file to scheduled directory
            fs.renameSync(image.path, scheduledImagePath);
            return scheduledImagePath;
        });

        // Update the task
        const updatedTask = {
            ...existingTask,
            groupName,
            message,
            cron: cronTime,
            description: description || '',
            updatedAt: new Date().toISOString(),
            imagePaths: imagePaths
        };

        // Update in schedule data
        scheduleData[taskIndex] = updatedTask;
        saveScheduleData(scheduleData);

        res.json({
            success: true,
            message: 'Scheduled message updated successfully',
            task: updatedTask
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to update scheduled message',
            details: error.message
        });
    }
});

// Get available groups
app.get('/api/groups', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.json({
                success: false,
                error: 'WhatsApp client is not ready'
            });
        }

        const chats = await client.getChats();
        const groups = chats
            .filter(chat => chat.isGroup)
            .map(group => ({
                id: group.id._serialized,
                name: group.name,
                participants: group.participants ? group.participants.length : 0
            }));

        res.json({
            success: true,
            data: groups
        });
    } catch (error) {
        res.json({
            success: false,
            error: 'Failed to fetch groups',
            details: error.message
        });
    }
});

// Promote bot to admin in all groups where user is admin
app.post('/api/groups/promote-bot', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp client is not ready'
            });
        }

        const currentUser = client.info.wid._serialized;
        const chats = await client.getChats();
        const groups = chats.filter(chat => chat.isGroup);

        const results = [];
        const botId = client.info.wid._serialized;

        for (const group of groups) {
            try {
                // Check if current user is admin in this group
                const isAdmin = await isUserAdmin(client, group, currentUser);

                if (isAdmin) {
                    // Get participants to check if bot is already admin
                    const participants = await group.getParticipants();
                    const botParticipant = participants.find(p => p.id._serialized === botId);

                    if (botParticipant && (botParticipant.isAdmin || botParticipant.isSuperAdmin)) {
                        results.push({
                            groupName: group.name,
                            status: 'already_admin',
                            message: 'Bot is already an admin'
                        });
                    } else if (botParticipant) {
                        // Promote bot to admin
                        await group.promoteParticipants([botId]);
                        results.push({
                            groupName: group.name,
                            status: 'promoted',
                            message: 'Bot promoted to admin successfully'
                        });
                    } else {
                        results.push({
                            groupName: group.name,
                            status: 'not_member',
                            message: 'Bot is not a member of this group'
                        });
                    }
                } else {
                    results.push({
                        groupName: group.name,
                        status: 'no_permission',
                        message: 'You are not an admin in this group'
                    });
                }
            } catch (error) {
                results.push({
                    groupName: group.name,
                    status: 'error',
                    message: `Failed to promote: ${error.message}`
                });
            }
        }

        const promoted = results.filter(r => r.status === 'promoted').length;
        const alreadyAdmin = results.filter(r => r.status === 'already_admin').length;

        res.json({
            success: true,
            message: `Promotion complete: ${promoted} groups promoted, ${alreadyAdmin} already admin`,
            results,
            summary: {
                promoted,
                alreadyAdmin,
                total: results.length
            }
        });

    } catch (error) {
        console.error('Error promoting bot to admin:', error);
        res.status(500).json({
            error: 'Failed to promote bot to admin',
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

// Server is started above after WhatsApp client initialization

module.exports = app;