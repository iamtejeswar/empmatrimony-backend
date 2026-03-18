// src/routes/chat.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getConversations, getMessages, startConversation, getUnreadCount } = require('../controllers/chatController');

router.get('/conversations', authenticate, getConversations);
router.get('/conversations/:conversationId/messages', authenticate, getMessages);
router.post('/conversations/:userId/start', authenticate, startConversation);
router.get('/unread-count', authenticate, getUnreadCount);

module.exports = router;
