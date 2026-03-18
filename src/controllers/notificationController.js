// src/controllers/notificationController.js
const { sequelize } = require('../config/database');

// POST /api/v1/notifications/token
const saveToken = async (req, res, next) => {
  try {
    const { token, platform = 'web' } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    await sequelize.query(`
      INSERT INTO fcm_tokens (id, user_id, token, platform, updated_at)
      VALUES (gen_random_uuid(), :userId, :token, :platform, NOW())
      ON CONFLICT (user_id, token) DO UPDATE SET updated_at = NOW()
    `, { replacements: { userId: req.user.id, token, platform } });

    res.json({ success: true, message: 'Token saved' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/notifications/token
const removeToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    await sequelize.query(
      'DELETE FROM fcm_tokens WHERE user_id = :userId AND token = :token',
      { replacements: { userId: req.user.id, token } }
    );
    res.json({ success: true, message: 'Token removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { saveToken, removeToken };
