import type { PrismaClient } from '../generated/prisma/client';

import { seedPermissions } from './permissions.seed';
import { seedRoles } from './roles.seed';
import { seedRolePermissions } from './role-permissions.seed';
import { seedUsers } from './users.seed';

export const seedDatabase = async (prisma: PrismaClient): Promise<void> => {
  const permissionMap = await seedPermissions(prisma);
  const roleMap = await seedRoles(prisma);

  await seedRolePermissions(prisma, roleMap, permissionMap);
  await seedUsers(prisma, roleMap);
};
