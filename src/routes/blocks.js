// src/routes/blocks.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { blockUser, unblockUser, getBlockedUsers, reportUser } = require('../controllers/blockController');

router.get('/', authenticate, getBlockedUsers);
router.post('/:userId', authenticate, blockUser);
router.delete('/:userId', authenticate, unblockUser);
router.post('/:userId/report', authenticate, reportUser);

module.exports = router;
