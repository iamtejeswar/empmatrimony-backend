// src/routes/interests.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  sendInterest,
  respondInterest,
  getReceivedInterests,
  getSentInterests,
  getInterestStatus,
  withdrawInterest,
} = require('../controllers/interestController');

// All routes require auth
router.use(authenticate);

router.post('/send/:receiverId',       sendInterest);
router.patch('/:interestId/respond',   respondInterest);
router.get('/received',                getReceivedInterests);
router.get('/sent',                    getSentInterests);
router.get('/status/:profileId',       getInterestStatus);
router.delete('/:interestId',          withdrawInterest);

module.exports = router;
