// src/routes/profile.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  getMyProfile, savePersonalDetails, saveFamilyDetails,
  saveEmploymentDetails, saveCommunityDetails, completeProfile, getPublicProfile,
} = require('../controllers/profileController');

router.get('/', authenticate, getMyProfile);
router.put('/step/1', authenticate, savePersonalDetails);
router.put('/step/2', authenticate, saveFamilyDetails);
router.put('/step/3', authenticate, saveEmploymentDetails);
router.put('/step/4', authenticate, saveCommunityDetails);
router.post('/complete', authenticate, completeProfile);
router.get('/:userId', authenticate, getPublicProfile);

module.exports = router;
