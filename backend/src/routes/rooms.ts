import { Router } from 'express';
import prisma from '../db.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

// Get all rooms
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      include: { teacher: { select: { firstName: true, lastName: true } } },
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin-only: Create/Update room
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const { name, number, teacherId, isClosed, approvalRequired, capacity } = req.body;

  try {
    const room = await prisma.room.create({
      data: { name, number, teacherId, isClosed, approvalRequired, capacity },
    });
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create room' });
  }
});

// Teacher: Update room status
router.put('/:id/status', authMiddleware, roleMiddleware(['TEACHER', 'ADMIN']), async (req: any, res) => {
  const { id } = req.params;
  const { isClosed, approvalRequired } = req.body;

  try {
    const room = await prisma.room.findUnique({ where: { id } });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if teacher owns the room
    if (req.user.role === 'TEACHER' && room.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized for this room' });
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: { isClosed, approvalRequired },
    });

    res.json(updatedRoom);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update status' });
  }
});

export default router;
