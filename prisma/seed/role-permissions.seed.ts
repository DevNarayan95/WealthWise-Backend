import { PrismaClient } from '../generated/prisma/client';

const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],

  ADMIN: [
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'roles:read',
    'permissions:read',
    'accounts:read',
    'accounts:update',
  ],

  ACCOUNT_MANAGER: [
    'users:read',
    'accounts:create',
    'accounts:read',
    'accounts:update',
  ],

  CUSTOMER: ['profile:read', 'profile:update', 'accounts:read'],
};

export const seedRolePermissions = async (
  prisma: PrismaClient,
  roleMap: Map<string, string>,
  permissionMap: Map<string, string>,
): Promise<void> => {
  console.log('Seeding role permissions...');

  for (const [roleName, permissions] of Object.entries(rolePermissions)) {
    const roleId = roleMap.get(roleName);

    if (!roleId) {
      throw new Error(`Role not found: ${roleName}`);
    }

    for (const permissionName of permissions) {
      if (permissionName === '*') {
        for (const permissionId of permissionMap.values()) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId,
                permissionId,
              },
            },
            update: {},
            create: {
              roleId,
              permissionId,
            },
          });
        }

        continue;
      }

      const permissionId = permissionMap.get(permissionName);

      if (!permissionId) {
        throw new Error(`Permission not found: ${permissionName}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId,
        },
      });
    }
  }

  console.log('✓ Role permissions seeded');
};
