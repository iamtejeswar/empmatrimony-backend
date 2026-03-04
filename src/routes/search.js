// src/routes/search.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { searchProfiles, getFilterOptions } = require('../controllers/searchController');

router.get('/', authenticate, searchProfiles);
router.get('/filters', getFilterOptions);

module.exports = router;
