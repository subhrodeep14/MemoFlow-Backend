// routes/activity.routes.js
const express = require('express');
const router = express.Router();
const { createActivity, getActivitiesByDate, updateActivity, deleteActivity } = require('../controllers/activity.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', getActivitiesByDate);
router.post('/', createActivity);
router.patch('/:id', updateActivity);
router.delete('/:id', deleteActivity);

module.exports = router;
