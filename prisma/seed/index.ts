import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

import { seedDatabase } from './seed-database';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

const main = async (): Promise<void> => {
  console.log('========================================');
  console.log('Starting NAVRO database seed...');
  console.log('========================================');

  await seedDatabase(prisma);

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
