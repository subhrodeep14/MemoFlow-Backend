// controllers/memo.controller.js
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const { createError } = require('../middleware/errorHandler');
const { isDateLocked, formatDate } = require('../utils/dateUtils');

const prisma = new PrismaClient();

const memoSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(10000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

const updateMemoSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(10000).optional(),
});

// Generate unique memo number using DB transaction
const generateMemoNumber = async (prismaClient, date) => {
  const dateObj = new Date(date);
  const dateKey = formatDate(dateObj);
  const [year, month, day] = dateKey.split('-');

  const counter = await prismaClient.memoCounter.upsert({
    where: { date: new Date(date) },
    update: { count: { increment: 1 } },
    create: { date: new Date(date), count: 1 },
  });

  const sequence = String(counter.count).padStart(4, '0');
  return `MEMO-${year}-${month}-${day}-${sequence}`;
};

const createMemo = async (req, res, next) => {
  try {
    const parsed = memoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const { title, description, date } = parsed.data;
    const entryDate = new Date(date);

    if (isDateLocked(entryDate)) {
      return res.status(403).json({ error: 'Cannot create entries for dates older than 1 year' });
    }

    const memo = await prisma.$transaction(async (tx) => {
      const memoNumber = await generateMemoNumber(tx, date);
      return tx.memo.create({
        data: {
          memoNumber,
          title,
          description: description || null,
          date: entryDate,
        },
        include: { attachments: true },
      });
    });

    res.status(201).json({ memo });
  } catch (err) {
    next(err);
  }
};

const getMemosByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const entryDate = new Date(date);
    const memos = await prisma.memo.findMany({
      where: { date: entryDate },
      include: { attachments: { select: { id: true, originalName: true, size: true, uploadedAt: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const memosWithLockStatus = memos.map(memo => ({
      ...memo,
      isLocked: isDateLocked(memo.date),
    }));

    res.json({ memos: memosWithLockStatus });
  } catch (err) {
    next(err);
  }
};

const getMemoById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const memo = await prisma.memo.findUnique({
      where: { id },
      include: { attachments: { select: { id: true, originalName: true, size: true, uploadedAt: true } } },
    });

    if (!memo) {
      return res.status(404).json({ error: 'Memo not found' });
    }

    res.json({ memo: { ...memo, isLocked: isDateLocked(memo.date) } });
  } catch (err) {
    next(err);
  }
};

const searchMemos = async (req, res, next) => {
  try {
    const { q, memoNumber, startDate, endDate, page = 1, limit = 20 } = req.query;

    const where = {};

    if (memoNumber) {
      where.memoNumber = { contains: memoNumber.toUpperCase(), mode: 'insensitive' };
    }
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { memoNumber: { contains: q.toUpperCase(), mode: 'insensitive' } },
      ];
    }
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [memos, total] = await Promise.all([
      prisma.memo.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: parseInt(limit),
        include: { attachments: { select: { id: true } } },
      }),
      prisma.memo.count({ where }),
    ]);

    res.json({
      memos: memos.map(m => ({ ...m, isLocked: isDateLocked(m.date) })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

const updateMemo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = updateMemoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const existing = await prisma.memo.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Memo not found' });
    if (isDateLocked(existing.date)) return res.status(403).json({ error: 'This entry is locked (older than 1 year)' });

    const memo = await prisma.memo.update({ where: { id }, data: parsed.data });
    res.json({ memo });
  } catch (err) {
    next(err);
  }
};

const deleteMemo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.memo.findUnique({ where: { id }, include: { attachments: true } });
    if (!existing) return res.status(404).json({ error: 'Memo not found' });
    if (isDateLocked(existing.date)) return res.status(403).json({ error: 'This entry is locked (older than 1 year)' });

    // Delete associated files from disk
    const fs = require('fs');
    for (const file of existing.attachments) {
      try { fs.unlinkSync(file.path); } catch (e) { /* file may already be gone */ }
    }

    await prisma.memo.delete({ where: { id } });
    res.json({ message: 'Memo deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createMemo, getMemosByDate, getMemoById, searchMemos, updateMemo, deleteMemo };
