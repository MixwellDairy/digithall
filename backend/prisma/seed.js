import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { studentId: 'admin' },
    update: {},
    create: {
      firstName: 'System',
      lastName: 'Admin',
      studentId: 'admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  await prisma.room.upsert({
    where: { number: '101' },
    update: {},
    create: {
      name: 'General Office',
      number: '101',
      capacity: 10,
    }
  });

  console.log('Seeded database with admin user (admin / admin123) and room 101');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
