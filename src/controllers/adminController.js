// src/controllers/adminController.js
const { Op } = require('sequelize');
const { User, PersonalDetails, FamilyDetails, EmploymentDetails, CommunityDetails, Document } = require('../models');
const { sequelize } = require('../config/database');
const { sendAccountStatusEmail } = require('../services/emailService');
const { AppError } = require('../utils/AppError');
const logger = require('../config/logger');

/**
 * @route   GET /api/v1/admin/dashboard
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [total, pending, active, suspended, blocked, profileComplete, registeredToday] = await Promise.all([
      User.count({ where: { role: 'user' } }),
      User.count({ where: { accountStatus: 'pending', role: 'user' } }),
      User.count({ where: { accountStatus: 'active', role: 'user' } }),
      User.count({ where: { accountStatus: 'suspended', role: 'user' } }),
      User.count({ where: { accountStatus: 'blocked', role: 'user' } }),
      User.count({ where: { role: 'user', isProfileComplete: true } }),
      User.count({ where: { role: 'user', createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    ]);

    const genderStats = await User.findAll({
      where: { role: 'user' },
      attributes: ['gender', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
      group: ['gender'],
      raw: true,
    });

    const male = genderStats.find(g => g.gender === 'male')?.count || 0;
    const female = genderStats.find(g => g.gender === 'female')?.count || 0;

    // Extra stats
    const [[{ totalInterests }]] = await sequelize.query('SELECT COUNT(*) AS totalInterests FROM interests');
    const [[{ totalMessages }]] = await sequelize.query('SELECT COUNT(*) AS totalMessages FROM messages');
    const [[{ pendingReports }]] = await sequelize.query("SELECT COUNT(*) AS pendingReports FROM reports WHERE status = 'pending'");

    res.json({
      success: true,
      data: {
        stats: {
          total, pending, active, suspended, blocked,
          profileComplete: parseInt(profileComplete),
          registeredToday,
          male: parseInt(male),
          female: parseInt(female),
          totalInterests: parseInt(totalInterests),
          totalMessages: parseInt(totalMessages),
          pendingReports: parseInt(pendingReports),
        },
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
    const { status, search, page = 1, limit = 15 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
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
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: {
        users: rows,
        total: count,
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
    if (!validStatuses.includes(status)) return next(new AppError('Invalid status', 400));

    const user = await User.findByPk(userId);
    if (!user) return next(new AppError('User not found', 404));

    await user.update({ accountStatus: status, adminApproved: status === 'active' });
    await sendAccountStatusEmail(user.email, user.firstName, status, reason);
    logger.info(`Admin ${req.user.email} changed user ${user.email} status to ${status}`);

    res.json({ success: true, message: `User status updated to ${status}` });
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
        { association: 'documents', attributes: ['id', 'documentType', 'verificationStatus', 'createdAt', 'rejectionReason'] },
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
    await doc.update({ verificationStatus: status, verifiedBy: req.user.id, verifiedAt: new Date(), rejectionReason: status === 'rejected' ? rejectionReason : null });
    res.json({ success: true, message: `Document ${status}` });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/admin/reports
 */
const getReports = async (req, res, next) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [reports] = await sequelize.query(`
      SELECT
        r.id, r.reason, r.description, r.status, r.created_at,
        r.reported_id,
        u1.first_name AS reporter_first_name, u1.last_name AS reporter_last_name,
        u2.first_name AS reported_first_name, u2.last_name AS reported_last_name,
        u2.email AS reported_email, u2.account_status AS reported_account_status
      FROM reports r
      JOIN users u1 ON u1.id = r.reporter_id
      JOIN users u2 ON u2.id = r.reported_id
      WHERE r.status = :status
      ORDER BY r.created_at DESC
      LIMIT :limit OFFSET :offset
    `, { replacements: { status, limit: parseInt(limit), offset } });

    const [[{ total }]] = await sequelize.query(
      'SELECT COUNT(*) AS total FROM reports WHERE status = :status',
      { replacements: { status } }
    );

    res.json({ success: true, data: { reports, total: parseInt(total) } });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/admin/reports/:reportId
 */
const updateReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    await sequelize.query(`
      UPDATE reports SET status = :status, reviewed_by = :reviewedBy, reviewed_at = NOW()
      WHERE id = :reportId
    `, { replacements: { status, reviewedBy: req.user.id, reportId } });

    res.json({ success: true, message: `Report ${status}` });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats, getUsers, updateUserStatus, getUserDetails, verifyDocument, getReports, updateReport };
