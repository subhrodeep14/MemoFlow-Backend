// backend/controllers/calendar.controller.js
// COMPLETE REPLACEMENT — adds entries groupBy to calendar summary
'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getCalendarSummary = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: 'year and month query params required' });
    }

    const y = parseInt(year);
    const m = parseInt(month) - 1; // 0-indexed
    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0); // Last day of month

    const [memos, activities, files, entries] = await Promise.all([
      prisma.memo.groupBy({
        by: ['date'],
        where: { date: { gte: startDate, lte: endDate } },
        _count: { id: true },
      }),
      prisma.activity.groupBy({
        by: ['date'],
        where: { date: { gte: startDate, lte: endDate } },
        _count: { id: true },
      }),
      prisma.file.groupBy({
        by: ['linkedDate'],
        where: { linkedDate: { gte: startDate, lte: endDate } },
        _count: { id: true },
      }),
      prisma.entry.groupBy({
        by: ['date'],
        where: { date: { gte: startDate, lte: endDate } },
        _count: { id: true },
      }),
    ]);

    const dateMap = {};

    const addToMap = (items, dateKey, type) => {
      items.forEach((item) => {
        const dateStr = new Date(item[dateKey]).toISOString().split('T')[0];
        if (!dateMap[dateStr]) dateMap[dateStr] = { memos: 0, activities: 0, files: 0, entries: 0 };
        dateMap[dateStr][type] += item._count.id;
      });
    };

    addToMap(memos, 'date', 'memos');
    addToMap(activities, 'date', 'activities');
    addToMap(files, 'linkedDate', 'files');
    addToMap(entries, 'date', 'entries');

    res.json({ summary: dateMap });
  } catch (err) {
    next(err);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const [totalMemos, totalActivities, totalFiles, totalEntries, recentMemos, recentActivities, recentEntries] =
      await Promise.all([
        prisma.memo.count(),
        prisma.activity.count(),
        prisma.file.count(),
        prisma.entry.count(),
        prisma.memo.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, memoNumber: true, title: true, date: true, createdAt: true },
        }),
        prisma.activity.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, title: true, type: true, date: true },
        }),
        prisma.entry.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, memoNumber: true, senderName: true, receiverName: true, date: true, purpose: true },
        }),
      ]);

    res.json({
      stats: { totalMemos, totalActivities, totalFiles, totalEntries },
      recentMemos,
      recentActivities,
      recentEntries,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCalendarSummary, getDashboardStats };
