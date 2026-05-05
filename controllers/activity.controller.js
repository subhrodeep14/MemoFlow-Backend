// controllers/activity.controller.js
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const { isDateLocked } = require('../utils/dateUtils');

const prisma = new PrismaClient();

const activitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(10000).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  type: z.enum(['general', 'meeting', 'task', 'note']).default('general'),
});

const updateSchema = activitySchema.partial().omit({ date: true });

const createActivity = async (req, res, next) => {
  try {
    const parsed = activitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const { date, ...rest } = parsed.data;
    const entryDate = new Date(date);

    if (isDateLocked(entryDate)) {
      return res.status(403).json({ error: 'Cannot create entries for dates older than 1 year' });
    }

    const activity = await prisma.activity.create({
      data: { date: entryDate, ...rest },
    });

    res.status(201).json({ activity: { ...activity, isLocked: false } });
  } catch (err) {
    next(err);
  }
};

const getActivitiesByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const activities = await prisma.activity.findMany({
      where: { date: new Date(date) },
      orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
    });

    res.json({
      activities: activities.map(a => ({ ...a, isLocked: isDateLocked(a.date) })),
    });
  } catch (err) {
    next(err);
  }
};

const updateActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Activity not found' });
    if (isDateLocked(existing.date)) return res.status(403).json({ error: 'Entry is locked' });

    const activity = await prisma.activity.update({ where: { id }, data: parsed.data });
    res.json({ activity });
  } catch (err) {
    next(err);
  }
};

const deleteActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Activity not found' });
    if (isDateLocked(existing.date)) return res.status(403).json({ error: 'Entry is locked' });

    await prisma.activity.delete({ where: { id } });
    res.json({ message: 'Activity deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createActivity, getActivitiesByDate, updateActivity, deleteActivity };
