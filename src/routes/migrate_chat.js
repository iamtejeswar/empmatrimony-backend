// src/routes/migrate_chat.js
// TEMPORARY — delete after running once
const router = require('express').Router();
const { sequelize } = require('../config/database');

router.get('/create-chat', async (req, res) => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user1_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user2_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_message TEXT,
        last_message_at TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user1_id, user2_id)
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);

      CREATE TABLE IF NOT EXISTS messages (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content         TEXT NOT NULL,
        is_read         BOOLEAN NOT NULL DEFAULT FALSE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = FALSE;
    `);
    res.json({ success: true, message: 'conversations + messages tables created ✅ — now delete migrate_chat.js' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
