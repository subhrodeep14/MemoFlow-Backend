const prisma =
  require(
    "../config/prisma"
  );
const { z } = require('zod');



const purposeSchema = z.object({
  name: z.string().min(1, 'Purpose name required').max(100).trim(),
  code: z.string().min(1, 'Purpose code required').max(10).toUpperCase().trim(),
});

// Get all purposes
const getAllPurposes = async (req, res, next) => {
  try {
    const purposes = await prisma.purpose.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, code: true, createdAt: true }
    });
    res.json({ purposes });
  } catch (err) {
    next(err);
  }
};

// Get or create purpose by name
const getOrCreatePurpose = async (req, res, next) => {
  try {
    const parsed = purposeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const { name, code } = parsed.data;

    // Try to find existing purpose
    let purpose = await prisma.purpose.findFirst({
      where: { OR: [{ name }, { code }] }
    });

    // If not found, create new one
    if (!purpose) {
      purpose = await prisma.purpose.create({
        data: { name, code }
      });
    }

    res.json({ purpose });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Purpose name or code already exists' });
    }
    next(err);
  }
};

// Get purpose by ID
const getPurposeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const purpose = await prisma.purpose.findUnique({
      where: { id },
      include: { entries: true }
    });

    if (!purpose) {
      return res.status(404).json({ error: 'Purpose not found' });
    }

    res.json({ purpose });
  } catch (err) {
    next(err);
  }
};

// Update purpose
const updatePurpose = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = z.object({
      name: z.string().min(1).max(100).trim().optional(),
      code: z.string().min(1).max(10).toUpperCase().trim().optional(),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const purpose = await prisma.purpose.update({
      where: { id },
      data: parsed.data
    });

    res.json({ purpose });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Purpose name or code already exists' });
    }
    next(err);
  }
};

// Delete purpose
const deletePurpose = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.purpose.delete({ where: { id } });
    res.json({ message: 'Purpose deleted' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Purpose not found' });
    }
    next(err);
  }
};

module.exports = {
  getAllPurposes,
  getOrCreatePurpose,
  getPurposeById,
  updatePurpose,
  deletePurpose
};
