// src/controllers/authController.js
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const { User } = require('../models');
const { generateTokens } = require('../middleware/auth');
const { sendOTPEmail, sendWelcomeEmail } = require('../services/emailService');
const { AppError } = require('../utils/AppError');
const logger = require('../config/logger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Generate secure 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * @route   POST /api/v1/auth/send-otp
 * @desc    Send OTP to email for registration/login
 * @access  Public
 */
const sendOTP = async (req, res, next) => {
  try {
    const { email, purpose = 'registration' } = req.body;

    // Check OTP rate limit
    const existingUser = await User.findOne({ where: { email } });

    if (purpose === 'login' && !existingUser) {
      return next(new AppError('No account found with this email', 404));
    }

    if (existingUser) {
      // Check cooldown
      if (existingUser.otpExpiresAt) {
        const cooldownEnd = new Date(existingUser.otpExpiresAt.getTime() - (parseInt(process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000) + (parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60) * 1000));
        if (new Date() < cooldownEnd) {
          return next(new AppError('Please wait before requesting another OTP', 429));
        }
      }
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000);

    if (existingUser) {
      await existingUser.update({ otpSecret: otp, otpExpiresAt, otpAttempts: 0 });
    } else {
      // Store OTP temporarily (will be used during registration)
      // We create a minimal user record or use a separate OTP store
      await User.upsert({
        email,
        firstName: 'Pending',
        lastName: 'User',
        otpSecret: otp,
        otpExpiresAt,
        otpAttempts: 0,
        accountStatus: 'pending',
      });
    }

    await sendOTPEmail(email, otp, purpose);

    logger.info(`OTP sent to ${email} for ${purpose}`);
    res.json({ success: true, message: 'OTP sent to your email', expiresInMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES || 10) });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify OTP
 * @access  Public
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return next(new AppError('User not found', 404));

    if (user.otpAttempts >= parseInt(process.env.OTP_MAX_ATTEMPTS || 3)) {
      return next(new AppError('Too many failed attempts. Please request a new OTP.', 429));
    }

    if (!user.otpSecret || !user.otpExpiresAt) {
      return next(new AppError('No OTP found. Please request a new one.', 400));
    }

    if (new Date() > user.otpExpiresAt) {
      return next(new AppError('OTP has expired. Please request a new one.', 400));
    }

    if (user.otpSecret !== otp) {
      await user.increment('otpAttempts');
      return next(new AppError('Invalid OTP', 400));
    }

    await user.update({ otpSecret: null, otpExpiresAt: null, otpAttempts: 0, isEmailVerified: true });

    res.json({ success: true, message: 'OTP verified successfully', emailVerified: true });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/register
 * @desc    Complete registration after OTP verification
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { email, firstName, lastName, dateOfBirth, gender, mobile, password } = req.body;

    const existingUser = await User.findOne({ where: { email } });

    if (existingUser && !existingUser.isEmailVerified) {
      return next(new AppError('Please verify your email first', 400));
    }

    if (existingUser && existingUser.isProfileComplete) {
      return next(new AppError('An account with this email already exists', 409));
    }

    let user;
    if (existingUser) {
      // Update the pending user record
      await existingUser.update({
        firstName,
        lastName,
        dateOfBirth,
        gender,
        mobile,
        password,
        authProvider: 'local',
        accountStatus: 'pending',
        profileCompletionStep: 0,
      });
      user = existingUser;
    } else {
      return next(new AppError('Please verify your email first', 400));
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    await user.update({ refreshToken, lastLoginAt: new Date() });

    await sendWelcomeEmail(email, firstName, lastName);

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: `Welcome, ${lastName}! Your account has been created.`,
      data: {
        user: user.toSafeJSON(),
        accessToken,
        refreshToken,
        redirectTo: '/profile/complete',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with email OTP
 * @access  Public
 */
const loginWithOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user || !user.isEmailVerified) {
      return next(new AppError('Account not found or not verified', 401));
    }

    if (user.accountStatus === 'blocked') {
      return next(new AppError('Your account has been blocked', 403));
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    await user.update({ refreshToken, lastLoginAt: new Date() });

    res.json({
      success: true,
      message: `Welcome back, ${user.lastName}!`,
      data: {
        user: user.toSafeJSON(),
        accessToken,
        refreshToken,
        redirectTo: user.isProfileComplete ? '/dashboard' : '/profile/complete',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/google
 * @desc    Google OAuth2 Sign In
 * @access  Public
 */
const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name: firstName, family_name: lastName, picture } = payload;

    if (!payload.email_verified) {
      return next(new AppError('Google account email not verified', 400));
    }

    let user = await User.findOne({ where: { googleId } });

    if (!user) {
      user = await User.findOne({ where: { email } });
    }

    const isNewUser = !user;

    if (!user) {
      user = await User.create({
        email,
        googleId,
        firstName,
        lastName,
        authProvider: 'google',
        isEmailVerified: true,
        accountStatus: 'pending',
      });
    } else {
      await user.update({ googleId, lastLoginAt: new Date() });
    }

    if (user.accountStatus === 'blocked') {
      return next(new AppError('Your account has been blocked', 403));
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    await user.update({ refreshToken, lastLoginAt: new Date() });

    if (isNewUser) {
      await sendWelcomeEmail(email, firstName, lastName);
    }

    logger.info(`Google auth: ${email} (${isNewUser ? 'new' : 'existing'} user)`);

    res.json({
      success: true,
      message: `Welcome${isNewUser ? '' : ' back'}, ${user.lastName}!`,
      data: {
        user: user.toSafeJSON(),
        accessToken,
        refreshToken,
        isNewUser,
        redirectTo: user.isProfileComplete ? '/dashboard' : '/profile/complete',
      },
    });
  } catch (error) {
    logger.error('Google auth error:', error);
    next(new AppError('Google authentication failed', 401));
  }
};

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return next(new AppError('Refresh token required', 400));

    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return next(new AppError('Invalid or expired refresh token', 401));
    }

    const user = await User.findByPk(decoded.userId);
    if (!user || user.refreshToken !== token) {
      return next(new AppError('Invalid refresh token', 401));
    }

    const tokens = generateTokens(user.id);
    await user.update({ refreshToken: tokens.refreshToken });

    res.json({ success: true, data: tokens });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    await req.user.update({ refreshToken: null });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
const getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
};

module.exports = { sendOTP, verifyOTP, register, loginWithOTP, googleAuth, refreshToken, logout, getMe };
