// routes/file.routes.js
const express = require('express');
const router = express.Router();
const { upload, uploadFile, getFile, getFilesByDate, deleteFile } = require('../controllers/file.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadRateLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);
router.get('/', getFilesByDate);
router.post('/upload', uploadRateLimiter, upload.single('file'), uploadFile);
router.get('/:id', getFile);
router.delete('/:id', deleteFile);

module.exports = router;
