import { PrismaClient } from '../../../prisma/generated/prisma/client';

export const cleanupDatabase = async (prisma: PrismaClient): Promise<void> => {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
         AND tablename != '_prisma_migrations';
    `;

  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "public"."${tablename}" RESTART IDENTITY CASCADE`,
    );
  }
};
