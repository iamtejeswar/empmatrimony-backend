// src/controllers/blockController.js
const { sequelize } = require('../config/database');
const { AppError } = require('../utils/AppError');

// POST /api/v1/blocks/:userId
const blockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (userId === req.user.id) return next(new AppError('Cannot block yourself', 400));

    await sequelize.query(`
      INSERT INTO blocks (id, blocker_id, blocked_id)
      VALUES (gen_random_uuid(), :blockerId, :blockedId)
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING
    `, { replacements: { blockerId: req.user.id, blockedId: userId } });

    res.json({ success: true, message: 'User blocked' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/blocks/:userId
const unblockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await sequelize.query(`
      DELETE FROM blocks WHERE blocker_id = :blockerId AND blocked_id = :blockedId
    `, { replacements: { blockerId: req.user.id, blockedId: userId } });

    res.json({ success: true, message: 'User unblocked' });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/blocks
const getBlockedUsers = async (req, res, next) => {
  try {
    const [blocked] = await sequelize.query(`
      SELECT
        b.created_at AS blocked_at,
        u.id, u.first_name, u.last_name, u.gender,
        pd.profile_picture_url,
        fd.city, fd.state,
        ed.job_role
      FROM blocks b
      JOIN users u ON u.id = b.blocked_id
      LEFT JOIN personal_details pd ON pd.user_id = u.id
      LEFT JOIN family_details fd ON fd.user_id = u.id
      LEFT JOIN employment_details ed ON ed.user_id = u.id
      WHERE b.blocker_id = :userId
      ORDER BY b.created_at DESC
    `, { replacements: { userId: req.user.id } });

    res.json({ success: true, data: { blocked, total: blocked.length } });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/reports/:userId
const reportUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { reason, description } = req.body;

    if (userId === req.user.id) return next(new AppError('Cannot report yourself', 400));

    const validReasons = ['fake_profile','inappropriate_content','harassment','spam','scam','underage','other'];
    if (!reason || !validReasons.includes(reason)) {
      return next(new AppError('Invalid reason', 400));
    }

    await sequelize.query(`
      INSERT INTO reports (id, reporter_id, reported_id, reason, description)
      VALUES (gen_random_uuid(), :reporterId, :reportedId, :reason, :description)
    `, { replacements: { reporterId: req.user.id, reportedId: userId, reason, description: description || null } });

    res.json({ success: true, message: 'Report submitted. Our team will review it.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { blockUser, unblockUser, getBlockedUsers, reportUser };
