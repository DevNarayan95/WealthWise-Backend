import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/prisma/client';

export const createTestPrismaClient = (): PrismaClient => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run integration tests');
  }

  if (!connectionString.includes('navro_test_db')) {
    throw new Error('Integration tests must use navro_test_db');
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
};
