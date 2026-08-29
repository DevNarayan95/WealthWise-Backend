import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

import { seedPermissions } from './permissions.seed';
import { seedRoles } from './roles.seed';
import { seedRolePermissions } from './role-permissions.seed';
import { seedUsers } from './users.seed';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

const main = async (): Promise<void> => {
  console.log('========================================');
  console.log('Starting WealthWise database seed...');
  console.log('========================================');

  const permissionMap = await seedPermissions(prisma);
  const roleMap = await seedRoles(prisma);

  await seedRolePermissions(prisma, roleMap, permissionMap);
  await seedUsers(prisma, roleMap);

  console.log('========================================');
  console.log('✓ Database seed completed successfully');
  console.log('========================================');
};

main()
  .catch((error: unknown) => {
    console.error('✗ Database seed failed');

    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
