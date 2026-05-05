// routes/calendar.routes.js
const express = require('express');
const router = express.Router();
const { getCalendarSummary, getDashboardStats } = require('../controllers/calendar.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/summary', getCalendarSummary);
router.get('/stats', getDashboardStats);

module.exports = router;
