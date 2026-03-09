// src/routes/auth.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  sendOTP, verifyOTP, register, loginWithOTP,
  googleAuth, refreshToken, logout, getMe,
} = require('../controllers/authController');
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

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

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed` }),
  async (req, res) => {
    try {
      const accessToken = jwt.sign(
        { id: req.user.id, email: req.user.email, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      const refreshToken = jwt.sign(
        { id: req.user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      await req.user.update({ refreshToken });

      // Redirect to frontend with tokens
      res.redirect(`${process.env.FRONTEND_URL}/auth/google/success?accessToken=${accessToken}&refreshToken=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        isProfileComplete: req.user.isProfileComplete,
        profileCompletionStep: req.user.profileCompletionStep,
      }))}`);
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_failed`);
    }
  }
);

module.exports = router;
