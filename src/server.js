// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

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

// Ensure logs directory exists
if (!fs.existsSync('logs')) fs.mkdirSync('logs', { recursive: true });

const app = express();
app.set('trust proxy', 1);
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

// ---- Security Middleware ----
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001',
    'https://employeematrimony.com',
    'https://www.employeematrimony.com',
    'https://empmatrimony-frontend.vercel.app',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ---- General Rate Limiting ----
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP specific rate limit
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.OTP_RATE_LIMIT_MAX) || 5,
  message: { success: false, message: 'Too many OTP requests. Please wait.' },
});

app.use(limiter);
app.use(compression());
app.use('/migrate', require('./routes/migrate'));

// ---- Parsing Middleware ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---- Logging ----
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// ---- Swagger Documentation ----
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Matrimony Platform API',
      version: '1.0.0',
      description: 'Production-ready REST API for Matrimony Platform - Web & Android',
      contact: { name: 'API Support', email: 'support@matrimony.com' },
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 5000}${API_PREFIX}`, description: 'Development Server' },
      { url: `https://api.matrimony.com${API_PREFIX}`, description: 'Production Server' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

if (process.env.SWAGGER_ENABLED === 'true') {
  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use(`${API_PREFIX}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { background-color: #1a237e; }',
    customSiteTitle: 'Matrimony API Docs',
  }));
  logger.info('📚 Swagger docs enabled (development only)');
}

// ---- Health Check ----
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  });
});

// ---- API Routes ----
app.use(`${API_PREFIX}/auth`, otpLimiter, authRoutes);
app.use(`${API_PREFIX}/profile`, profileRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/documents`, documentRoutes);
const interestRoutes = require('./routes/interests');
app.use(`${API_PREFIX}/interests`, interestRoutes);

// ---- 404 Handler ----
app.use('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});
// ---- Global Error Handler ----
app.use(errorHandler);

// ---- Start Server ----
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Import models to register associations
  const { sequelize } = require('./config/database');
  require('./models/index');
//Sync models to existing tables (no force, no alter)
  await sequelize.sync({ force: false, alter: false });
  logger.info('✅ Models synced to existing tables');

  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    logger.info(`📚 API Docs: http://localhost:${PORT}${API_PREFIX}/docs`);
    logger.info(`🏥 Health: http://localhost:${PORT}/health`);
  });
};

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

startServer();

module.exports = app;