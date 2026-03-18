// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { AppError } = require('../utils/AppError');
const logger = require('../config/logger');

/**
 * Verify JWT access token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication token required', 401));
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Token expired. Please login again.', 401));
      }
      return next(new AppError('Invalid token', 401));
    }

    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password', 'otpSecret', 'refreshToken'] },
    });

    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }

    if (user.accountStatus === 'blocked') {
      return next(new AppError('Your account has been blocked. Contact support.', 403));
    }

    if (user.accountStatus === 'suspended') {
      return next(new AppError('Your account is suspended. Contact support.', 403));
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    next(new AppError('Authentication failed', 401));
  }
};

/**
 * Restrict access to specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password', 'otpSecret', 'refreshToken'] },
    });
    if (user) req.user = user;
    next();
  } catch {
    next(); // Continue without auth
  }
};

/**
 * Generate JWT tokens
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

module.exports = { authenticate, authorize, optionalAuth, generateTokens };
