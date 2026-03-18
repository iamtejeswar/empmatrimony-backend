// src/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const { connectDB } = require('./config/database');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const { AppError } = require('./utils/AppError');

// Route imports
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const searchRoutes = require('./routes/search');
const adminRoutes = require('./routes/admin');
const documentRoutes = require('./routes/documents');
const interestRoutes = require('./routes/interests');
const blocksRoutes = require('./routes/blocks');
const chatRoutes = require('./routes/chat');

if (!fs.existsSync('logs')) fs.mkdirSync('logs', { recursive: true });

const app = express();
const httpServer = http.createServer(app); // ← wrap express in http server for Socket.io

app.set('trust proxy', 1);
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3001',
  'https://employeematrimony.com',
  'https://www.employeematrimony.com',
  'https://empmatrimony-frontend.vercel.app',
];

// ---- Socket.io ----
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
  pingTimeout: 60000,
});

// Socket.io JWT auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;   // ← FIXED
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// Track online users: userId -> socketId
const onlineUsers = new Map();

io.on('connection', (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);
  logger.info(`Socket connected: ${userId}`);

  // Join personal room for direct messages
  socket.join(`user:${userId}`);

  // Join a conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conv:${conversationId}`);
  });

  // Leave a conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conv:${conversationId}`);
  });

  // Send message
  socket.on('send_message', async ({ conversationId, content }) => {
  if (!conversationId || !content?.trim()) return;
  try {
    const { sequelize } = require('./config/database');
    const { sendToUser } = require('./config/firebase');

    const [[conv]] = await sequelize.query(`
      SELECT id, user1_id, user2_id FROM conversations
      WHERE id = :conversationId
        AND (user1_id = :userId OR user2_id = :userId)
    `, { replacements: { conversationId, userId } });

    if (!conv) return;

    const [msgRows] = await sequelize.query(`
      INSERT INTO messages (id, conversation_id, sender_id, content)
      VALUES (gen_random_uuid(), :conversationId, :senderId, :content)
      RETURNING id, conversation_id, sender_id, content, is_read, created_at
    `, { replacements: { conversationId, senderId: userId, content: content.trim() } });
    const msg = msgRows[0];

    await sequelize.query(`
      UPDATE conversations
      SET last_message = :content, last_message_at = NOW()
      WHERE id = :conversationId
    `, { replacements: { conversationId, content: content.trim().substring(0, 100) } });

    io.to(`conv:${conversationId}`).emit('message_received', msg);

    const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;
    io.to(`user:${otherUserId}`).emit('new_message_notification', { conversationId, message: msg });

    // FCM push to other user
    const [[sender]] = await sequelize.query(
      'SELECT first_name FROM users WHERE id = :userId',
      { replacements: { userId } }
    );
    sendToUser(otherUserId, {
      title: `New message from ${sender?.first_name || 'Someone'}`,
      body: content.trim().substring(0, 100),
      data: { url: `/chat/${conversationId}`, conversationId },
    }).catch(() => {});

  } catch (err) {
    logger.error('Socket send_message error:', err);
  }
});
  // Typing indicators
  socket.on('typing', ({ conversationId }) => {
    socket.to(`conv:${conversationId}`).emit('user_typing', { userId, conversationId });
  });

  socket.on('stop_typing', ({ conversationId }) => {
    socket.to(`conv:${conversationId}`).emit('user_stop_typing', { userId, conversationId });
  });

  // Mark messages as read
  socket.on('mark_read', async ({ conversationId }) => {
    try {
      const { sequelize } = require('./config/database');
      await sequelize.query(`
        UPDATE messages SET is_read = TRUE
        WHERE conversation_id = :conversationId
          AND sender_id != :userId
          AND is_read = FALSE
      `, { replacements: { conversationId, userId } });

      socket.to(`conv:${conversationId}`).emit('messages_read', { conversationId, readBy: userId });
    } catch (err) {
      logger.error('Socket mark_read error:', err);
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    logger.info(`Socket disconnected: ${userId}`);
  });
});

// ---- Security Middleware ----
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: allowedOrigins, credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));

// ---- Rate Limiting ----
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true, legacyHeaders: false,
});
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.OTP_RATE_LIMIT_MAX) || 5,
  message: { success: false, message: 'Too many OTP requests. Please wait.' },
});

app.use(limiter);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// ---- Swagger ----
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Matrimony Platform API', version: '1.0.0', description: 'Production-ready REST API' },
    servers: [
      { url: `http://localhost:${process.env.PORT || 5000}${API_PREFIX}`, description: 'Development' },
      { url: `https://api.matrimony.com${API_PREFIX}`, description: 'Production' },
    ],
    components: { securitySchemes: { BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};
if (process.env.SWAGGER_ENABLED === 'true') {
  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use(`${API_PREFIX}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// ---- Health Check ----
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString(), environment: process.env.NODE_ENV, version: '1.0.0' });
});

// ---- API Routes ----
app.use(`${API_PREFIX}/auth`, otpLimiter, authRoutes);
app.use(`${API_PREFIX}/profile`, profileRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/documents`, documentRoutes);
app.use(`${API_PREFIX}/interests`, interestRoutes);
app.use(`${API_PREFIX}/blocks`, blocksRoutes);
app.use(`${API_PREFIX}/chat`, chatRoutes);

//chat
app.use('/migrate', require('./routes/migrate_fcm'));
   app.use(`${API_PREFIX}/notifications`, require('./routes/notifications'));

// ---- 404 & Error Handler ----
app.use('*', (req, res, next) => next(new AppError(`Route ${req.originalUrl} not found`, 404)));
app.use(errorHandler);

// ---- Start Server ----
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  const { sequelize } = require('./config/database');
  require('./models/index');
  await sequelize.sync({ force: false, alter: false });
  logger.info('✅ Models synced');

  httpServer.listen(PORT, () => { // ← listen on httpServer not app
    logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    logger.info(`🔌 Socket.io ready`);
  });
};

process.on('unhandledRejection', (err) => { logger.error('Unhandled Rejection:', err); process.exit(1); });
process.on('uncaughtException', (err) => { logger.error('Uncaught Exception:', err); process.exit(1); });

startServer();
module.exports = app;
