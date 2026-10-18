import * as dotenv from 'dotenv';

import { seedDatabase } from '../../prisma/seed/seed-database';
import { cleanupDatabase } from '../helpers/database/cleanup';
import { createTestPrismaClient } from '../helpers/database/test-database';

export default async (): Promise<void> => {
  dotenv.config({ path: '.env.test' });

  const prisma = createTestPrismaClient();

  try {
    await cleanupDatabase(prisma);
    await seedDatabase(prisma);
  } finally {
    await prisma.$disconnect();
  }
};
