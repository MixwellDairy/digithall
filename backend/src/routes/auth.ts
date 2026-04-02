import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

router.post('/login', async (req, res) => {
  const { studentId, password } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { studentId: studentId },
          { firstName: studentId }, // Allow teacher/admin login with firstName as username if needed
        ],
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, firstName: user.firstName, lastName: user.lastName },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user.id, role: user.role, firstName: user.firstName, lastName: user.lastName } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Kiosk Student Login (No Password)
router.post('/kiosk/login', async (req, res) => {
  const { studentId } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { studentId },
    });

    if (!user || user.role !== 'STUDENT') {
      return res.status(404).json({ message: 'Student not found' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, firstName: user.firstName, lastName: user.lastName },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    res.json({ token, user: { id: user.id, role: user.role, firstName: user.firstName, lastName: user.lastName } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
