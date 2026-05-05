// backend/controllers/entry.controller.js
'use strict';

const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// ─── Validation Schema ────────────────────────────────────────────────────────
const createEntrySchema = z.object({
  slNo: z
    .union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)])
    .refine((v) => v > 0, 'SL No must be a positive integer'),
  senderName: z.string().min(1, 'Sender name required').max(200).trim(),
  senderCode: z
    .string()
    .min(1, 'Sender code required')
    .max(20)
    .trim()
    .toUpperCase(),
  receiverName: z.string().min(1, 'Receiver name required').max(200).trim(),
  receiverCode: z
    .string()
    .min(1, 'Receiver code required')
    .max(20)
    .trim()
    .toUpperCase(),
  purpose: z.string().min(1, 'Purpose required').max(300).trim(),
  description: z.string().min(1, 'Description required').max(5000).trim(),
  sendCount: z
    .union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)])
    .refine((v) => v >= 1 && v <= 999, 'Send count must be between 1 and 999'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate memo number: MEMO-[YEAR]-[SLNO padded 4]-[COMPANYCODE]-[COUNT padded 2]
 * Count is based on how many times the SAME senderCode OR receiverCode appears
 */
async function generateMemoNumber(tx, { year, slNo, senderCode, date }) {
  // Count prior entries for this sender company (regardless of date)
  const existingCount = await tx.entry.count({
    where: {
      senderCode: senderCode.toUpperCase(),
    },
  });

  const count = existingCount + 1; // This entry will be count+1
  const slPadded = String(slNo).padStart(4, '0');
  const countPadded = String(count).padStart(2, '0');
  const code = senderCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

  return `MEMO-${year}-${slPadded}-${code}-${countPadded}`;
}

// ─── Controller: Get SL Options ───────────────────────────────────────────────
const getSlOptions = async (req, res, next) => {
  try {
    // Get all used SL numbers
    const usedEntries = await prisma.entry.findMany({
      select: { slNo: true },
      orderBy: { slNo: 'asc' },
    });

    const usedSet = new Set(usedEntries.map((e) => e.slNo));

    // Find the highest used SL number
    const maxUsed = usedEntries.length > 0 ? Math.max(...usedEntries.map((e) => e.slNo)) : 0;

    // Build next 30 available sequential slots from max+1
    const nextSlots = [];
    let candidate = maxUsed + 1;
    while (nextSlots.length < 30) {
      if (!usedSet.has(candidate)) nextSlots.push(candidate);
      candidate++;
    }

    // Find "gap" SL numbers (previously skipped / unused slots below maxUsed)
    const gaps = [];
    for (let i = 1; i <= maxUsed; i++) {
      if (!usedSet.has(i)) gaps.push(i);
    }

    res.json({
      nextAvailable: nextSlots[0] ?? 1,
      nextSlots,      // Next 30 sequential available
      gaps,           // Unused previous numbers
      usedCount: usedSet.size,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Controller: Create Entry ─────────────────────────────────────────────────
const createEntry = async (req, res, next) => {
  try {
    // Parse body (form-data when file is present)
    const bodyRaw = {
      slNo: req.body.slNo,
      senderName: req.body.senderName,
      senderCode: req.body.senderCode,
      receiverName: req.body.receiverName,
      receiverCode: req.body.receiverCode,
      purpose: req.body.purpose,
      description: req.body.description,
      sendCount: req.body.sendCount,
      date: req.body.date,
    };

    const parsed = createEntrySchema.safeParse(bodyRaw);
    if (!parsed.success) {
      // Clean up uploaded file if validation fails
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const entryDate = new Date(data.date);
    const year = entryDate.getFullYear();

    // ── Validate file if present ──────────────────────────────────────────────
    let fileData = null;
    if (req.file) {
      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Only PDF and image files (JPG, PNG, WEBP) are allowed' });
      }
      fileData = {
        filePath: req.file.path,
        fileName: req.file.originalname.slice(0, 255),
        fileMime: req.file.mimetype,
        fileUrl: `/api/entry/file/${path.basename(req.file.filename || req.file.path)}`,
      };
    }

    // ── Prisma transaction ────────────────────────────────────────────────────
    const entry = await prisma.$transaction(async (tx) => {
      // 1. Check SL number uniqueness
      const existingSl = await tx.entry.findUnique({ where: { slNo: data.slNo } });
      if (existingSl) {
        throw Object.assign(new Error(`SL No ${data.slNo} is already taken`), { statusCode: 409 });
      }

      // 2. Generate memo number
      const memoNumber = await generateMemoNumber(tx, {
        year,
        slNo: data.slNo,
        senderCode: data.senderCode,
        date: entryDate,
      });

      // 3. Record SL counter
      await tx.slCounter.upsert({
        where: { value: data.slNo },
        update: { usedAt: new Date() },
        create: { value: data.slNo },
      });

      // 4. Create entry
      return tx.entry.create({
        data: {
          slNo: data.slNo,
          memoNumber,
          senderName: data.senderName,
          senderCode: data.senderCode.toUpperCase(),
          receiverName: data.receiverName,
          receiverCode: data.receiverCode.toUpperCase(),
          purpose: data.purpose,
          description: data.description,
          sendCount: data.sendCount,
          date: entryDate,
          ...fileData,
        },
      });
    });

    res.status(201).json({ entry, message: 'Entry created successfully' });
  } catch (err) {
    // Clean up file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    next(err);
  }
};

// ─── Controller: Get Entries By Date ─────────────────────────────────────────
const getEntriesByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD' });
    }

    const entries = await prisma.entry.findMany({
      where: { date: new Date(date) },
      orderBy: { slNo: 'asc' },
    });

    res.json({ entries });
  } catch (err) {
    next(err);
  }
};

// ─── Controller: Stream File ──────────────────────────────────────────────────
const getEntryFile = async (req, res, next) => {
  try {
    const { filename } = req.params;

    // Sanitize – only basename allowed (prevent path traversal)
    const safeName = path.basename(filename);
    const entry = await prisma.entry.findFirst({
      where: { filePath: { endsWith: safeName } },
    });

    if (!entry || !entry.filePath) return res.status(404).json({ error: 'File not found' });
    if (!fs.existsSync(entry.filePath)) return res.status(404).json({ error: 'File missing on disk' });

    res.setHeader('Content-Type', entry.fileMime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(entry.fileName || safeName)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache');

    fs.createReadStream(entry.filePath).pipe(res);
  } catch (err) {
    next(err);
  }
};

// ─── Controller: Get All (search/list) ───────────────────────────────────────
const getEntries = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const where = q
      ? {
          OR: [
            { memoNumber: { contains: q.toUpperCase(), mode: 'insensitive' } },
            { senderName: { contains: q, mode: 'insensitive' } },
            { senderCode: { contains: q.toUpperCase(), mode: 'insensitive' } },
            { receiverName: { contains: q, mode: 'insensitive' } },
            { purpose: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [entries, total] = await Promise.all([
      prisma.entry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.entry.count({ where }),
    ]);

    res.json({
      entries,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createEntry, getEntriesByDate, getSlOptions, getEntryFile, getEntries };
