// controllers/file.controller.js
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { isDateLocked } = require('../utils/dateUtils');

const prisma = new PrismaClient();

// Secure storage directory (outside public web root)
const SECURE_STORAGE = process.env.SECURE_STORAGE_PATH || path.join(__dirname, '../../secure-storage');

// Ensure storage directory exists
if (!fs.existsSync(SECURE_STORAGE)) {
  fs.mkdirSync(SECURE_STORAGE, { recursive: true, mode: 0o700 });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SECURE_STORAGE),
  filename: (req, file, cb) => {
    // Rename file to UUID to prevent path traversal and hide original name
    const storedName = `${uuidv4()}.pdf`;
    cb(null, storedName);
  },
});

// File filter - ONLY allow PDF
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Only PDF files are allowed'), false);
  }
  cb(null, true);
};

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Double-check MIME type from file buffer (magic bytes validation)
    const fileBuffer = fs.readFileSync(req.file.path);
    const isPDF = fileBuffer.slice(0, 4).toString('hex') === '25504446'; // %PDF
    if (!isPDF) {
      fs.unlinkSync(req.file.path); // Delete non-PDF
      return res.status(400).json({ error: 'File content must be a valid PDF' });
    }

    const { date, memoId } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid date' });
    }

    const entryDate = new Date(date);
    if (isDateLocked(entryDate)) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Cannot upload files for dates older than 1 year' });
    }

    // Verify memoId if provided
    if (memoId) {
      const memo = await prisma.memo.findUnique({ where: { id: memoId } });
      if (!memo) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Memo not found' });
      }
    }

    const fileRecord = await prisma.file.create({
      data: {
        originalName: req.file.originalname.substring(0, 255), // Sanitize length
        storedName: req.file.filename,
        mimeType: 'application/pdf',
        size: req.file.size,
        path: req.file.path,
        linkedDate: entryDate,
        memoId: memoId || null,
      },
    });

    res.status(201).json({
      file: {
        id: fileRecord.id,
        originalName: fileRecord.originalName,
        size: fileRecord.size,
        uploadedAt: fileRecord.uploadedAt,
      },
    });
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

const getFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await prisma.file.findUnique({ where: { id } });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Set secure headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', file.size);
    res.setHeader('Cache-Control', 'private, no-cache');

    // Stream the file
    const fileStream = fs.createReadStream(file.path);
    fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
};

const getFilesByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const files = await prisma.file.findMany({
      where: { linkedDate: new Date(date) },
      select: { id: true, originalName: true, size: true, uploadedAt: true, memoId: true, linkedDate: true },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json({
      files: files.map(f => ({ ...f, isLocked: isDateLocked(f.linkedDate) })),
    });
  } catch (err) {
    next(err);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (isDateLocked(file.linkedDate)) return res.status(403).json({ error: 'File is locked' });

    // Delete from disk
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    await prisma.file.delete({ where: { id } });
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { upload, uploadFile, getFile, getFilesByDate, deleteFile };
