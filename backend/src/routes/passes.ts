import { Router } from 'express';
import prisma from '../db.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

// Student/Staff: Request a pass
router.post('/request', authMiddleware, roleMiddleware(['STUDENT', 'TEACHER', 'ADMIN', 'HALL_MONITOR']), async (req: any, res) => {
  const { fromRoomId, toRoomId, type, scheduledTime, studentId: targetStudentId } = req.body;
  const studentId = targetStudentId || req.user.id;

  // If a non-student is requesting, ensure they provided a studentId
  if (req.user.role !== 'STUDENT' && !targetStudentId) {
    return res.status(400).json({ message: 'Target student required' });
  }

  try {
    const fromRoom = await prisma.room.findUnique({ where: { id: fromRoomId } });
    const toRoom = await prisma.room.findUnique({ where: { id: toRoomId } });

    if (!fromRoom || !toRoom) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (toRoom.isClosed && !scheduledTime) {
      return res.status(403).json({ message: 'Target room is closed' });
    }

    // Room Capacity Check
    if (toRoom.capacity > 0) {
      const currentInRoom = await prisma.pass.count({
        where: { toRoomId, status: 'ACTIVE' },
      });
      if (currentInRoom >= toRoom.capacity) {
        return res.status(403).json({ message: 'Target room is at capacity.' });
      }
    }

    // Pass Limit Check (Dummy implementation, should be more robust)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayPasses = await prisma.pass.findMany({
      where: {
        studentId: studentId,
        createdAt: { gte: today },
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
    });

    const passCount = todayPasses.reduce((acc, pass) => acc + (pass.type === 'ONE_WAY' ? 0.5 : 1.0), 0);

    // Encounter Prevention Check
    const activePasses = await prisma.pass.findMany({
      where: { status: 'ACTIVE' },
      include: { student: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: studentId },
      include: { blockedWith: true, blockedBy: true },
    });

    const blockedIds = new Set([
      ...(user?.blockedWith.map((u) => u.id) || []),
      ...(user?.blockedBy.map((u) => u.id) || []),
    ]);

    for (const pass of activePasses) {
      if (blockedIds.has(pass.studentId)) {
        return res.status(403).json({ message: 'Encounter prevention: Another student is currently in the hall.' });
      }
    }

    // Dynamic daily limit check from settings
    const limitSetting = await prisma.setting.findUnique({ where: { key: 'DAILY_PASS_LIMIT' } });
    const dailyLimit = limitSetting ? parseFloat(limitSetting.value) : 5.0;

    if (passCount >= dailyLimit) {
      return res.status(403).json({ message: `Daily pass limit of ${dailyLimit} reached.` });
    }

    // If staff is creating the pass, auto-approve it
    const isStaff = ['TEACHER', 'ADMIN', 'HALL_MONITOR'].includes(req.user.role);
    const status = scheduledTime ? 'PENDING' : (isStaff ? 'ACTIVE' : (toRoom.approvalRequired ? 'PENDING' : 'ACTIVE'));
    const startTime = (status === 'ACTIVE' && !scheduledTime) ? new Date() : null;

    const pass = await prisma.pass.create({
      data: {
        studentId,
        fromRoomId,
        toRoomId,
        type,
        status,
        startTime,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      },
      include: { student: true, toRoom: true, fromRoom: true },
    });

    // Notify teacher via Socket.io
    if (toRoom.approvalRequired && toRoom.teacherId) {
      req.io.to(`teacher:${toRoom.teacherId}`).emit('new-pass-request', pass);
    }

    req.io.emit('pass-updated', pass);
    res.status(201).json(pass);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to request pass' });
  }
});

// Teacher: Approve/Deny
router.put('/:id/status', authMiddleware, roleMiddleware(['TEACHER', 'ADMIN', 'HALL_MONITOR']), async (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'ACTIVE', 'DENIED', 'COMPLETED'

  try {
    const pass = await prisma.pass.findUnique({
      where: { id },
      include: { toRoom: true, fromRoom: true },
    });

    if (!pass) {
      return res.status(404).json({ message: 'Pass not found' });
    }

    const data: any = { status };
    if (status === 'ACTIVE' && !pass.startTime) {
      data.startTime = new Date();
      data.approvedById = req.user.id;
    }
    if (status === 'COMPLETED') {
      data.endTime = new Date();
    }

    const updatedPass = await prisma.pass.update({
      where: { id },
      data,
      include: { student: true, toRoom: true, fromRoom: true },
    });

    req.io.emit('pass-updated', updatedPass);
    res.json(updatedPass);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update pass' });
  }
});

// Export history (Admin only)
router.get('/export', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const passes = await prisma.pass.findMany({
      include: { student: true, toRoom: true, fromRoom: true }
    });

    const header = 'Student,Student ID,From,To,Type,Status,Start Time,End Time\n';
    const rows = passes.map(p => {
      const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
      return [
        escape(`${p.student.firstName} ${p.student.lastName}`),
        escape(p.student.studentId || ''),
        escape(p.fromRoom.name),
        escape(p.toRoom.name),
        escape(p.type),
        escape(p.status),
        escape(p.startTime?.toISOString() || ''),
        escape(p.endTime?.toISOString() || '')
      ].join(',');
    }).join('\n');

    res.header('Content-Type', 'text/csv');
    res.attachment('pass-history.csv');
    res.send(header + rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get analytics (Admin only)
router.get('/analytics', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const passCountByRoom = await prisma.pass.groupBy({
      by: ['toRoomId'],
      _count: { id: true },
    });

    const roomNames = await prisma.room.findMany({
      where: { id: { in: passCountByRoom.map(r => r.toRoomId) } },
      select: { id: true, name: true }
    });

    const analytics = passCountByRoom.map(item => ({
      room: roomNames.find(r => r.id === item.toRoomId)?.name || 'Unknown',
      count: item._count.id
    }));

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student pass history
router.get('/history', authMiddleware, roleMiddleware(['STUDENT']), async (req: any, res) => {
  try {
    const history = await prisma.pass.findMany({
      where: { studentId: req.user.id },
      include: { toRoom: true, fromRoom: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Hall Monitor/Admin: All active passes
router.get('/active', authMiddleware, roleMiddleware(['ADMIN', 'HALL_MONITOR', 'TEACHER']), async (req, res) => {
  try {
    const passes = await prisma.pass.findMany({
      where: { status: 'ACTIVE' },
      include: { student: true, toRoom: true, fromRoom: true },
    });
    res.json(passes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
