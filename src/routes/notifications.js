// src/routes/notifications.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { saveToken, removeToken } = require('../controllers/notificationController');

router.post('/token', authenticate, saveToken);
router.delete('/token', authenticate, removeToken);

module.exports = router;
