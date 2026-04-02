import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import roomRoutes from './routes/rooms.js';
import passRoutes from './routes/passes.js';
import settingRoutes from './routes/settings.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

// Socket.io middleware to attach io to req
app.use((req: any, res, next) => {
  req.io = io;
  next();
});

// Pass Activation Cron-like task
setInterval(async () => {
  const now = new Date();
  try {
    const scheduled = await prisma.pass.findMany({
      where: {
        status: 'PENDING',
        scheduledTime: { lte: now },
      },
      include: { toRoom: true }
    });

    for (const pass of scheduled) {
      const status = pass.toRoom.approvalRequired ? 'PENDING' : 'ACTIVE';
      const startTime = status === 'ACTIVE' ? new Date() : null;

      await prisma.pass.update({
        where: { id: pass.id },
        data: { status, startTime, scheduledTime: null }
      });
      io.emit('pass-updated', pass);
    }

    // Overtime check (duration limit exceeded)
    const active = await prisma.pass.findMany({
      where: { status: 'ACTIVE', startTime: { not: null } }
    });

    for (const pass of active) {
      const limit = pass.durationLimit || 15; // default 15 mins
      const elapsed = (now.getTime() - new Date(pass.startTime!).getTime()) / 60000;
      if (elapsed > limit && !pass.isOvertime) {
        await prisma.pass.update({
          where: { id: pass.id },
          data: { isOvertime: true }
        });
        io.emit('pass-updated', pass);
      }
    }

  } catch (err) {
    console.error('Background task failed:', err);
  }
}, 60000); // Check every minute

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/passes', passRoutes);
app.use('/api/settings', settingRoutes);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (room) => {
    socket.join(room);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
