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
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001'],
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

// Temporary seed route - DELETE AFTER USE
app.get('/seed-profiles', async (req, res) => {
  try {
    const { sequelize } = require('./config/database');

    // Insert users one by one to skip duplicates
    const users = [
      ['a1b2c3d4-0001-0001-0001-000000000001','Arjun','Sharma','arjun.sharma@test.com','9100000001','male','1995-03-15','free'],
      ['a1b2c3d4-0002-0002-0002-000000000002','Priya','Reddy','priya.reddy@test.com','9100000002','female','1997-07-22','free'],
      ['a1b2c3d4-0003-0003-0003-000000000003','Rahul','Verma','rahul.verma@test.com','9100000003','male','1993-11-08','gold'],
      ['a1b2c3d4-0004-0004-0004-000000000004','Sneha','Patel','sneha.patel@test.com','9100000004','female','1996-05-30','free'],
      ['a1b2c3d4-0005-0005-0005-000000000005','Vikram','Nair','vikram.nair@test.com','9100000005','male','1994-09-12','premium'],
      ['a1b2c3d4-0006-0006-0006-000000000006','Anjali','Menon','anjali.menon@test.com','9100000006','female','1998-02-18','free'],
      ['a1b2c3d4-0007-0007-0007-000000000007','Mohammed','Khan','mohammed.khan@test.com','9100000007','male','1992-06-25','free'],
      ['a1b2c3d4-0008-0008-0008-000000000008','Fatima','Sheikh','fatima.sheikh@test.com','9100000008','female','1996-12-10','gold'],
      ['a1b2c3d4-0009-0009-0009-000000000009','Rohan','Desai','rohan.desai@test.com','9100000009','male','1991-04-03','free'],
      ['a1b2c3d4-0010-0010-0010-000000000010','Kavya','Iyer','kavya.iyer@test.com','9100000010','female','1999-08-14','free'],
      ['a1b2c3d4-0011-0011-0011-000000000011','Aditya','Singh','aditya.singh@test.com','9100000011','male','1993-01-20','premium'],
      ['a1b2c3d4-0012-0012-0012-000000000012','Deepika','Gupta','deepika.gupta@test.com','9100000012','female','1995-10-05','free'],
      ['a1b2c3d4-0013-0013-0013-000000000013','Samuel','Thomas','samuel.thomas@test.com','9100000013','male','1990-07-17','free'],
      ['a1b2c3d4-0014-0014-0014-000000000014','Ananya','Joseph','ananya.joseph@test.com','9100000014','female','1997-03-28','gold'],
      ['a1b2c3d4-0015-0015-0015-000000000015','Karthik','Subramanian','karthik.sub@test.com','9100000015','male','1994-12-01','free'],
      ['a1b2c3d4-0016-0016-0016-000000000016','Meera','Pillai','meera.pillai@test.com','9100000016','female','1996-06-19','free'],
      ['a1b2c3d4-0017-0017-0017-000000000017','Imran','Ali','imran.ali@test.com','9100000017','male','1992-09-30','free'],
      ['a1b2c3d4-0018-0018-0018-000000000018','Pooja','Joshi','pooja.joshi@test.com','9100000018','female','1998-04-11','premium'],
      ['a1b2c3d4-0019-0019-0019-000000000019','Nikhil','Mehta','nikhil.mehta@test.com','9100000019','male','1991-11-23','free'],
      ['a1b2c3d4-0020-0020-0020-000000000020','Shreya','Bose','shreya.bose@test.com','9100000020','female','1995-08-07','gold'],
    ];

    const errors = [];
    let inserted = 0;
    for (const u of users) {
      try {
        await sequelize.query(`
          INSERT INTO users (id, first_name, last_name, email, mobile, gender, date_of_birth, role, account_status, admin_approved, is_email_verified, is_profile_complete, profile_completion_step, subscription_plan, created_at, updated_at)
          VALUES ('${u[0]}','${u[1]}','${u[2]}','${u[3]}','${u[4]}','${u[5]}','${u[6]}','user','active',true,true,true,5,'${u[7]}',NOW(),NOW())
        `);
        inserted++;
      } catch(e)  { errors.push(`${u[3]}: ${e.message}`); }
    }

    const personalDetails = [
      ['a1b2c3d4-0001-0001-0001-000000000001','never_married',175,70,'Hindi','Indian','Software engineer who loves cricket and travelling.'],
      ['a1b2c3d4-0002-0002-0002-000000000002','never_married',163,55,'Telugu','Indian','Doctor by profession, passionate about music and reading.'],
      ['a1b2c3d4-0003-0003-0003-000000000003','never_married',178,75,'Hindi','Indian','MBA graduate working in finance. Love cooking and outdoor adventures.'],
      ['a1b2c3d4-0004-0004-0004-000000000004','never_married',160,52,'Gujarati','Indian','Teacher who enjoys painting and yoga.'],
      ['a1b2c3d4-0005-0005-0005-000000000005','never_married',180,78,'Malayalam','Indian','Civil engineer with a passion for photography and travel.'],
      ['a1b2c3d4-0006-0006-0006-000000000006','never_married',158,50,'Malayalam','Indian','Chartered accountant who loves dance and movies.'],
      ['a1b2c3d4-0007-0007-0007-000000000007','never_married',172,68,'Urdu','Indian','Business owner passionate about food and sports.'],
      ['a1b2c3d4-0008-0008-0008-000000000008','never_married',162,54,'Urdu','Indian','Software developer who loves reading and cooking.'],
      ['a1b2c3d4-0009-0009-0009-000000000009','never_married',176,72,'Marathi','Indian','Architect with a love for art and design.'],
      ['a1b2c3d4-0010-0010-0010-000000000010','never_married',165,55,'Tamil','Indian','Data scientist who enjoys hiking and photography.'],
      ['a1b2c3d4-0011-0011-0011-000000000011','never_married',177,74,'Hindi','Indian','IAS officer passionate about public service and reading.'],
      ['a1b2c3d4-0012-0012-0012-000000000012','never_married',161,53,'Hindi','Indian','Fashion designer who loves travelling and cooking.'],
      ['a1b2c3d4-0013-0013-0013-000000000013','never_married',174,70,'Tamil','Indian','Nurse with a big heart. Love music and gardening.'],
      ['a1b2c3d4-0014-0014-0014-000000000014','never_married',164,56,'Tamil','Indian','Lawyer who enjoys trekking and cooking.'],
      ['a1b2c3d4-0015-0015-0015-000000000015','never_married',173,69,'Tamil','Indian','IT professional who loves music and chess.'],
      ['a1b2c3d4-0016-0016-0016-000000000016','never_married',159,51,'Malayalam','Indian','Pharmacist who enjoys classical dance and cooking.'],
      ['a1b2c3d4-0017-0017-0017-000000000017','never_married',171,67,'Urdu','Indian','Chartered accountant who loves football and travelling.'],
      ['a1b2c3d4-0018-0018-0018-000000000018','never_married',166,57,'Hindi','Indian','Graphic designer passionate about art and music.'],
      ['a1b2c3d4-0019-0019-0019-000000000019','never_married',179,76,'Gujarati','Indian','Entrepreneur who loves cricket and travel.'],
      ['a1b2c3d4-0020-0020-0020-000000000020','never_married',162,54,'Bengali','Indian','Research scientist who loves literature and music.'],
    ];

    for (const p of personalDetails) {
      try {
        await sequelize.query(`INSERT INTO personal_details (user_id, marital_status, height, weight, mother_tongue, citizenship, about_me, created_at, updated_at) VALUES ('${p[0]}','${p[1]}',${p[2]},${p[3]},'${p[4]}','${p[5]}','${p[6]}',NOW(),NOW())`);
      } catch(e) { /* skip duplicate */ }
    }

    const communityDetails = [
      ['a1b2c3d4-0001-0001-0001-000000000001','Hindu','Brahmin'],
      ['a1b2c3d4-0002-0002-0002-000000000002','Hindu','Reddy'],
      ['a1b2c3d4-0003-0003-0003-000000000003','Hindu','Kayastha'],
      ['a1b2c3d4-0004-0004-0004-000000000004','Hindu','Patel'],
      ['a1b2c3d4-0005-0005-0005-000000000005','Hindu','Nair'],
      ['a1b2c3d4-0006-0006-0006-000000000006','Hindu','Menon'],
      ['a1b2c3d4-0007-0007-0007-000000000007','Muslim','Sheikh'],
      ['a1b2c3d4-0008-0008-0008-000000000008','Muslim','Pathan'],
      ['a1b2c3d4-0009-0009-0009-000000000009','Hindu','Maratha'],
      ['a1b2c3d4-0010-0010-0010-000000000010','Hindu','Iyer'],
      ['a1b2c3d4-0011-0011-0011-000000000011','Hindu','Rajput'],
      ['a1b2c3d4-0012-0012-0012-000000000012','Hindu','Gupta'],
      ['a1b2c3d4-0013-0013-0013-000000000013','Christian','Latin'],
      ['a1b2c3d4-0014-0014-0014-000000000014','Christian','Syrian'],
      ['a1b2c3d4-0015-0015-0015-000000000015','Hindu','Mudaliar'],
      ['a1b2c3d4-0016-0016-0016-000000000016','Hindu','Ezhava'],
      ['a1b2c3d4-0017-0017-0017-000000000017','Muslim','Syed'],
      ['a1b2c3d4-0018-0018-0018-000000000018','Hindu','Brahmin'],
      ['a1b2c3d4-0019-0019-0019-000000000019','Hindu','Bania'],
      ['a1b2c3d4-0020-0020-0020-000000000020','Hindu','Baidya'],
    ];

    for (const c of communityDetails) {
      try {
        await sequelize.query(`INSERT INTO community_details (user_id, religion, caste, created_at, updated_at) VALUES ('${c[0]}','${c[1]}','${c[2]}',NOW(),NOW())`);
      } catch(e) { /* skip duplicate */ }
    }

    const familyDetails = [
      ['a1b2c3d4-0001-0001-0001-000000000001','nuclear','middle_class','Delhi','Delhi'],
      ['a1b2c3d4-0002-0002-0002-000000000002','joint','upper_middle_class','Hyderabad','Telangana'],
      ['a1b2c3d4-0003-0003-0003-000000000003','nuclear','middle_class','Mumbai','Maharashtra'],
      ['a1b2c3d4-0004-0004-0004-000000000004','joint','middle_class','Ahmedabad','Gujarat'],
      ['a1b2c3d4-0005-0005-0005-000000000005','nuclear','upper_middle_class','Kochi','Kerala'],
      ['a1b2c3d4-0006-0006-0006-000000000006','nuclear','upper_class','Thrissur','Kerala'],
      ['a1b2c3d4-0007-0007-0007-000000000007','joint','middle_class','Lucknow','Uttar Pradesh'],
      ['a1b2c3d4-0008-0008-0008-000000000008','joint','middle_class','Pune','Maharashtra'],
      ['a1b2c3d4-0009-0009-0009-000000000009','nuclear','upper_middle_class','Nagpur','Maharashtra'],
      ['a1b2c3d4-0010-0010-0010-000000000010','joint','middle_class','Chennai','Tamil Nadu'],
      ['a1b2c3d4-0011-0011-0011-000000000011','nuclear','upper_class','Jaipur','Rajasthan'],
      ['a1b2c3d4-0012-0012-0012-000000000012','nuclear','middle_class','Bangalore','Karnataka'],
      ['a1b2c3d4-0013-0013-0013-000000000013','joint','middle_class','Kottayam','Kerala'],
      ['a1b2c3d4-0014-0014-0014-000000000014','nuclear','upper_middle_class','Coimbatore','Tamil Nadu'],
      ['a1b2c3d4-0015-0015-0015-000000000015','joint','middle_class','Madurai','Tamil Nadu'],
      ['a1b2c3d4-0016-0016-0016-000000000016','joint','middle_class','Trivandrum','Kerala'],
      ['a1b2c3d4-0017-0017-0017-000000000017','joint','middle_class','Hyderabad','Telangana'],
      ['a1b2c3d4-0018-0018-0018-000000000018','nuclear','middle_class','Bhopal','Madhya Pradesh'],
      ['a1b2c3d4-0019-0019-0019-000000000019','joint','upper_middle_class','Surat','Gujarat'],
      ['a1b2c3d4-0020-0020-0020-000000000020','nuclear','upper_middle_class','Kolkata','West Bengal'],
    ];

    for (const f of familyDetails) {
      try {
        await sequelize.query(`INSERT INTO family_details (user_id, family_type, family_status, city, state, country, created_at, updated_at) VALUES ('${f[0]}','${f[1]}','${f[2]}','${f[3]}','${f[4]}','India',NOW(),NOW())`);
      } catch(e) { /* skip duplicate */ }
    }

    const employmentDetails = [
      ['a1b2c3d4-0001-0001-0001-000000000001','B.Tech','private_job','Software Engineer',75000,900000],
      ['a1b2c3d4-0002-0002-0002-000000000002','MBBS','private_job','Doctor',120000,1440000],
      ['a1b2c3d4-0003-0003-0003-000000000003','MBA','private_job','Finance Manager',95000,1140000],
      ['a1b2c3d4-0004-0004-0004-000000000004','B.Ed','govt_job','Teacher',45000,540000],
      ['a1b2c3d4-0005-0005-0005-000000000005','B.Tech','private_job','Civil Engineer',80000,960000],
      ['a1b2c3d4-0006-0006-0006-000000000006','CA','private_job','Chartered Accountant',90000,1080000],
      ['a1b2c3d4-0007-0007-0007-000000000007','B.Com','business','Business Owner',150000,1800000],
      ['a1b2c3d4-0008-0008-0008-000000000008','B.Tech','private_job','Software Developer',70000,840000],
      ['a1b2c3d4-0009-0009-0009-000000000009','B.Arch','private_job','Architect',85000,1020000],
      ['a1b2c3d4-0010-0010-0010-000000000010','M.Tech','private_job','Data Scientist',100000,1200000],
      ['a1b2c3d4-0011-0011-0011-000000000011','IAS','govt_job','IAS Officer',110000,1320000],
      ['a1b2c3d4-0012-0012-0012-000000000012','B.Design','private_job','Fashion Designer',55000,660000],
      ['a1b2c3d4-0013-0013-0013-000000000013','B.Sc Nursing','govt_job','Nurse',40000,480000],
      ['a1b2c3d4-0014-0014-0014-000000000014','LLB','private_job','Lawyer',85000,1020000],
      ['a1b2c3d4-0015-0015-0015-000000000015','B.Tech','private_job','IT Professional',72000,864000],
      ['a1b2c3d4-0016-0016-0016-000000000016','B.Pharma','private_job','Pharmacist',50000,600000],
      ['a1b2c3d4-0017-0017-0017-000000000017','CA','private_job','Chartered Accountant',88000,1056000],
      ['a1b2c3d4-0018-0018-0018-000000000018','B.Design','private_job','Graphic Designer',58000,696000],
      ['a1b2c3d4-0019-0019-0019-000000000019','MBA','business','Entrepreneur',200000,2400000],
      ['a1b2c3d4-0020-0020-0020-000000000020','PhD','private_job','Research Scientist',95000,1140000],
    ];

    for (const e of employmentDetails) {
      try {
        await sequelize.query(`INSERT INTO employment_details (user_id, highest_education, employment_type, job_role, monthly_salary, annual_income, created_at, updated_at) VALUES ('${e[0]}','${e[1]}','${e[2]}','${e[3]}',${e[4]},${e[5]},NOW(),NOW())`);
      } catch(e2) { /* skip duplicate */ }
    }

    res.json({ success: true, message: `${inserted} users inserted!`, errors });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

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