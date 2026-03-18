// src/controllers/chatController.js
const { sequelize } = require('../config/database');
const { AppError } = require('../utils/AppError');

// GET /api/v1/chat/conversations
const getConversations = async (req, res, next) => {
  try {
    const [conversations] = await sequelize.query(`
      SELECT
        c.id,
        c.last_message,
        c.last_message_at,
        CASE WHEN c.user1_id = :userId THEN c.user2_id ELSE c.user1_id END AS other_user_id,
        CASE WHEN c.user1_id = :userId THEN u2.first_name ELSE u1.first_name END AS other_first_name,
        CASE WHEN c.user1_id = :userId THEN u2.last_name ELSE u1.last_name END AS other_last_name,
        CASE WHEN c.user1_id = :userId THEN u2.gender ELSE u1.gender END AS other_gender,
        CASE WHEN c.user1_id = :userId THEN pd2.profile_picture_url ELSE pd1.profile_picture_url END AS other_picture,
        (SELECT COUNT(*) FROM messages m
         WHERE m.conversation_id = c.id
           AND m.sender_id != :userId
           AND m.is_read = FALSE) AS unread_count
      FROM conversations c
      JOIN users u1 ON u1.id = c.user1_id
      JOIN users u2 ON u2.id = c.user2_id
      LEFT JOIN personal_details pd1 ON pd1.user_id = c.user1_id
      LEFT JOIN personal_details pd2 ON pd2.user_id = c.user2_id
      WHERE c.user1_id = :userId OR c.user2_id = :userId
      ORDER BY c.last_message_at DESC NULLS LAST
    `, { replacements: { userId: req.user.id } });

    res.json({ success: true, data: { conversations } });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/chat/conversations/:conversationId/messages
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 100 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Verify user is part of this conversation
    const [[conv]] = await sequelize.query(`
      SELECT id FROM conversations
      WHERE id = :conversationId
        AND (user1_id = :userId OR user2_id = :userId)
    `, { replacements: { conversationId, userId: req.user.id } });

    if (!conv) return next(new AppError('Conversation not found', 404));

    const [messages] = await sequelize.query(`
      SELECT
        m.id,
        m.content,
        m.sender_id,
        m.is_read,
        m.created_at,
        m.conversation_id
      FROM messages m
      WHERE m.conversation_id = :conversationId
      ORDER BY m.created_at ASC
      LIMIT :limit OFFSET :offset
    `, { replacements: { conversationId, limit: parseInt(limit), offset } });

    // Mark all received messages as read
    await sequelize.query(`
      UPDATE messages SET is_read = TRUE
      WHERE conversation_id = :conversationId
        AND sender_id != :userId
        AND is_read = FALSE
    `, { replacements: { conversationId, userId: req.user.id } });

    const [[{ total }]] = await sequelize.query(`
      SELECT COUNT(*) AS total FROM messages WHERE conversation_id = :conversationId
    `, { replacements: { conversationId } });

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          total: parseInt(total),
          page: parseInt(page),
          totalPages: Math.ceil(parseInt(total) / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/chat/conversations/:userId/start
const startConversation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (userId === req.user.id) return next(new AppError('Cannot chat with yourself', 400));

    const user1_id = req.user.id < userId ? req.user.id : userId;
    const user2_id = req.user.id < userId ? userId : req.user.id;

    await sequelize.query(`
      INSERT INTO conversations (id, user1_id, user2_id)
      VALUES (gen_random_uuid(), :user1_id, :user2_id)
      ON CONFLICT (user1_id, user2_id) DO NOTHING
    `, { replacements: { user1_id, user2_id } });

    const [[conv]] = await sequelize.query(`
      SELECT id FROM conversations WHERE user1_id = :user1_id AND user2_id = :user2_id
    `, { replacements: { user1_id, user2_id } });

    res.json({ success: true, data: { conversationId: conv.id } });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/chat/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const [[{ total }]] = await sequelize.query(`
      SELECT COUNT(*) AS total
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE (c.user1_id = :userId OR c.user2_id = :userId)
        AND m.sender_id != :userId
        AND m.is_read = FALSE
    `, { replacements: { userId: req.user.id } });

    res.json({ success: true, data: { unreadCount: parseInt(total) } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getConversations, getMessages, startConversation, getUnreadCount };
