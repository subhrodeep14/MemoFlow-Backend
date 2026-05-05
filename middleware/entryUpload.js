// backend/middleware/entryUpload.js
'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const SECURE_STORAGE = process.env.SECURE_STORAGE_PATH || path.join(__dirname, '../../../secure-storage');

// Ensure directory exists with restricted permissions
if (!fs.existsSync(SECURE_STORAGE)) {
  fs.mkdirSync(SECURE_STORAGE, { recursive: true, mode: 0o700 });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SECURE_STORAGE),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const safeName = `${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and image files (JPG, PNG, WEBP) are allowed'), false);
  }
};

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '15') * 1024 * 1024;

const entryUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: 1 },
});

module.exports = entryUpload;
