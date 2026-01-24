import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin123!', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@bamboo.edu' },
    update: {},
    create: {
      email: 'admin@bamboo.edu',
      name: 'Admin User',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('Created admin user:', adminUser.email);

  // Create instructor user
  const instructorPassword = await bcrypt.hash('Instructor123!', 12);

  const instructorUser = await prisma.user.upsert({
    where: { email: 'instructor@bamboo.edu' },
    update: {},
    create: {
      email: 'instructor@bamboo.edu',
      name: 'Test Instructor',
      password: instructorPassword,
      role: 'INSTRUCTOR',
      isActive: true,
    },
  });

  console.log('Created instructor user:', instructorUser.email);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
