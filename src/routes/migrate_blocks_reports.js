// src/routes/migrate_blocks_reports.js
// TEMPORARY — delete after running once
const router = require('express').Router();
const { sequelize } = require('../config/database');

router.get('/create-blocks-reports', async (req, res) => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS blocks (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(blocker_id, blocked_id)
      );

      CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
      CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

      CREATE TABLE IF NOT EXISTS reports (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason      VARCHAR(50) NOT NULL CHECK (reason IN (
                      'fake_profile','inappropriate_content','harassment',
                      'spam','scam','underage','other'
                    )),
        description TEXT,
        status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
        reviewed_by UUID REFERENCES users(id),
        reviewed_at TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);
      CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    `);
    res.json({ success: true, message: 'blocks + reports tables created ✅ — now delete migrate_blocks_reports.js' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
