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

  console.log('Seeded database with admin user (admin / admin123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
