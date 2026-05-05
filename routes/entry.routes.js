// backend/routes/entry.routes.js
'use strict';

const express = require('express');
const router = express.Router();

const {
  createEntry,
  getEntriesByDate,
  getSlOptions,
  getEntryFile,
  getEntries,
} = require('../controllers/entry.controller');

const { authenticate } = require('../middleware/auth.middleware');
const entryUpload = require('../middleware/entryUpload');
const { uploadRateLimiter } = require('../middleware/rateLimiter');

// All routes require auth
router.use(authenticate);

// SL number options (for the modal dropdown)
router.get('/sl-options', getSlOptions);

// List / search entries
router.get('/', getEntries);

// Entries by date (for DayPanel)
router.get('/by-date', getEntriesByDate);

// Create entry (with optional file upload)
router.post('/create', uploadRateLimiter, entryUpload.single('file'), createEntry);

// Serve file securely (auth already applied above)
router.get('/file/:filename', getEntryFile);

module.exports = router;
