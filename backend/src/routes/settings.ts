import { Router } from 'express';
import prisma from '../db.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

// Get all settings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin-only: Update setting
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const { key, value } = req.body;

  try {
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update setting' });
  }
});

export default router;
