// src/routes/migrate.js
// TEMPORARY — delete this file after running once
const router = require('express').Router();
const { sequelize } = require('../config/database');

router.get('/create-profile-views', async (req, res) => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS profile_views (
        id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        viewed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(viewer_id, viewed_id)
      );

      CREATE INDEX IF NOT EXISTS idx_profile_views_viewed
        ON profile_views(viewed_id, viewed_at DESC);

      CREATE INDEX IF NOT EXISTS idx_profile_views_viewer
        ON profile_views(viewer_id);
    `);
    res.json({ success: true, message: 'profile_views table created ✅ — now delete src/routes/migrate.js' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
