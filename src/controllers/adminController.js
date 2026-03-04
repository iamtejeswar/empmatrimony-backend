// src/controllers/adminController.js
const { Op } = require('sequelize');
const { User, PersonalDetails, FamilyDetails, EmploymentDetails, CommunityDetails, Document } = require('../models');
const { sendAccountStatusEmail } = require('../services/emailService');
const { AppError } = require('../utils/AppError');
const logger = require('../config/logger');

/**
 * @route   GET /api/v1/admin/dashboard
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [total, pending, active, suspended, blocked, today] = await Promise.all([
      User.count({ where: { role: 'user' } }),
      User.count({ where: { accountStatus: 'pending', role: 'user' } }),
      User.count({ where: { accountStatus: 'active', role: 'user' } }),
      User.count({ where: { accountStatus: 'suspended', role: 'user' } }),
      User.count({ where: { accountStatus: 'blocked', role: 'user' } }),
      User.count({
        where: {
          role: 'user',
          createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    const genderStats = await User.findAll({
      where: { role: 'user' },
      attributes: ['gender', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
      group: ['gender'],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        stats: { total, pending, active, suspended, blocked, registeredToday: today },
        genderDistribution: genderStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/admin/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { role: 'user' };
    if (status) where.accountStatus = status;
    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { mobile: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'otpSecret', 'refreshToken', 'googleId'] },
      include: [{ association: 'personalDetails', attributes: ['maritalStatus'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: {
        users: rows,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/admin/users/:userId/status
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['active', 'pending', 'suspended', 'blocked'];
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid status', 400));
    }

    const user = await User.findByPk(userId);
    if (!user) return next(new AppError('User not found', 404));

    const wasActive = user.accountStatus === 'active';
    await user.update({ accountStatus: status, adminApproved: status === 'active' });

    await sendAccountStatusEmail(user.email, user.firstName, status, reason);

    logger.info(`Admin ${req.user.email} changed user ${user.email} status to ${status}`);

    res.json({ success: true, message: `User status updated to ${status}`, data: { user: user.toSafeJSON() } });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/admin/users/:userId
 */
const getUserDetails = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: { exclude: ['password', 'otpSecret', 'refreshToken'] },
      include: [
        { association: 'personalDetails' },
        { association: 'familyDetails' },
        { association: 'employmentDetails' },
        { association: 'communityDetails' },
        {
          association: 'documents',
          attributes: ['id', 'documentType', 'verificationStatus', 'createdAt', 'rejectionReason'],
        },
      ],
    });

    if (!user) return next(new AppError('User not found', 404));
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/admin/documents/:documentId/verify
 */
const verifyDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { status, rejectionReason } = req.body;

    const doc = await Document.findByPk(documentId);
    if (!doc) return next(new AppError('Document not found', 404));

    await doc.update({
      verificationStatus: status,
      verifiedBy: req.user.id,
      verifiedAt: new Date(),
      rejectionReason: status === 'rejected' ? rejectionReason : null,
    });

    res.json({ success: true, message: `Document ${status}`, data: { document: doc } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats, getUsers, updateUserStatus, getUserDetails, verifyDocument };
