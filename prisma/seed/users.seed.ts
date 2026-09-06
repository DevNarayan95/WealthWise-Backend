import bcrypt from 'bcrypt';

import { PrismaClient } from '../generated/prisma/client';

const SALT_ROUNDS = 12;

export const seedUsers = async (
  prisma: PrismaClient,
  roleMap: Map<string, string>,
): Promise<void> => {
  console.log('Seeding system users...');

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email) {
    throw new Error('SEED_ADMIN_EMAIL is required');
  }

  if (!password) {
    throw new Error('SEED_ADMIN_PASSWORD is required');
  }

  const superAdminRoleId = roleMap.get('SUPER_ADMIN');

  if (!superAdminRoleId) {
    throw new Error('SUPER_ADMIN role not found');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: {
      email,
    },
    update: {
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      status: 'ACTIVE',
    },
    create: {
      email,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: superAdminRoleId,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: superAdminRoleId,
    },
  });

  console.log(`✓ Super Admin user seeded: ${email}`);
};
