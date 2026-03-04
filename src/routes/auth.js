// src/routes/auth.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  sendOTP, verifyOTP, register, loginWithOTP,
  googleAuth, refreshToken, logout, getMe,
} = require('../controllers/authController');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/register', register);
router.post('/login', loginWithOTP);
router.post('/google', googleAuth);
router.post('/refresh-token', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
