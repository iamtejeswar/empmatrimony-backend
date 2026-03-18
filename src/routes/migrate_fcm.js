// src/routes/migrate_fcm.js
// TEMPORARY — delete after running once
const router = require('express').Router();
const { sequelize } = require('../config/database');

router.get('/create-fcm', async (req, res) => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS fcm_tokens (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT NOT NULL,
        platform   VARCHAR(20) NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'android', 'ios')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, token)
      );
      CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON fcm_tokens(user_id);
    `);
    res.json({ success: true, message: 'fcm_tokens table created ✅ — now delete migrate_fcm.js' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
