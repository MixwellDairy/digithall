import { Router } from 'express';
import prisma from '../db.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { parse } from 'csv-parse/sync';
import bcrypt from 'bcryptjs';

const router = Router();

// Get current user info
router.get('/me', authMiddleware, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { room: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin-only: Get all students
router.get('/students', authMiddleware, roleMiddleware(['ADMIN', 'HALL_MONITOR', 'TEACHER']), async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, firstName: true, lastName: true, studentId: true, grade: true },
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin-only: Get all users
router.get('/', authMiddleware, roleMiddleware(['ADMIN', 'HALL_MONITOR']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { room: true },
    });
    res.json(users.map(({ password, ...u }) => u));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin-only: CSV Import Students
router.post('/import-students', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const { csvContent } = req.body;

  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });

    for (const record of records) {
      const { firstName, lastName, studentId, password, grade } = record as any;
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.upsert({
        where: { studentId },
        update: { firstName, lastName, grade, password: hashedPassword },
        create: { firstName, lastName, studentId, grade, password: hashedPassword, role: 'STUDENT' },
      });
    }

    res.json({ message: 'Students imported successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Import failed' });
  }
});

// Admin-only: Create/Update User
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const { firstName, lastName, studentId, password, grade, role, roomId, isFlagged, flagReason } = req.body;
  const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

  try {
    const user = await prisma.user.create({
      data: { firstName, lastName, studentId, grade, password: hashedPassword || '', role, roomId, isFlagged, flagReason },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Admin-only: Manage Encounter Prevention
router.post('/block', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const { studentId1, studentId2 } = req.body;
  try {
    await prisma.user.update({
      where: { id: studentId1 },
      data: { blockedWith: { connect: { id: studentId2 } } }
    });
    res.json({ message: 'Encounter prevention added' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to block students' });
  }
});

router.post('/unblock', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const { studentId1, studentId2 } = req.body;
  try {
    await prisma.user.update({
      where: { id: studentId1 },
      data: { blockedWith: { disconnect: { id: studentId2 } } }
    });
    res.json({ message: 'Encounter prevention removed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unblock students' });
  }
});

// Admin-only: Delete User
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Admin-only: Toggle flag
router.put('/:id/flag', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { isFlagged, flagReason } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { isFlagged, flagReason },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update flag' });
  }
});

export default router;
