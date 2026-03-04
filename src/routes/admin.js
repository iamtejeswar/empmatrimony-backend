// src/routes/admin.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getDashboardStats, getUsers, updateUserStatus, getUserDetails, verifyDocument,
} = require('../controllers/adminController');

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin', 'moderator'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.get('/users/:userId', getUserDetails);
router.put('/users/:userId/status', authorize('admin'), updateUserStatus);
router.put('/documents/:documentId/verify', verifyDocument);

module.exports = router;
