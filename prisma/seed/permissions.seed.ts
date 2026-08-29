import { PrismaClient } from '../generated/prisma/client';

const permissions = [
  // Users
  {
    resource: 'users',
    action: 'create',
    description: 'Create users',
  },
  {
    resource: 'users',
    action: 'read',
    description: 'View users',
  },
  {
    resource: 'users',
    action: 'update',
    description: 'Update users',
  },
  {
    resource: 'users',
    action: 'delete',
    description: 'Delete users',
  },

  // Roles
  {
    resource: 'roles',
    action: 'create',
    description: 'Create roles',
  },
  {
    resource: 'roles',
    action: 'read',
    description: 'View roles',
  },
  {
    resource: 'roles',
    action: 'update',
    description: 'Update roles',
  },
  {
    resource: 'roles',
    action: 'delete',
    description: 'Delete roles',
  },

  // Permissions
  {
    resource: 'permissions',
    action: 'create',
    description: 'Create permissions',
  },
  {
    resource: 'permissions',
    action: 'read',
    description: 'View permissions',
  },
  {
    resource: 'permissions',
    action: 'update',
    description: 'Update permissions',
  },
  {
    resource: 'permissions',
    action: 'delete',
    description: 'Delete permissions',
  },

  // Accounts
  {
    resource: 'accounts',
    action: 'create',
    description: 'Create accounts',
  },
  {
    resource: 'accounts',
    action: 'read',
    description: 'View accounts',
  },
  {
    resource: 'accounts',
    action: 'update',
    description: 'Update accounts',
  },
  {
    resource: 'accounts',
    action: 'delete',
    description: 'Delete accounts',
  },

  // Profile
  {
    resource: 'profile',
    action: 'read',
    description: 'View own profile',
  },
  {
    resource: 'profile',
    action: 'update',
    description: 'Update own profile',
  },
];

export const seedPermissions = async (
  prisma: PrismaClient,
): Promise<Map<string, string>> => {
  console.log('Seeding permissions...');

  const permissionMap = new Map<string, string>();

  for (const permission of permissions) {
    const record = await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: permission.resource,
          action: permission.action,
        },
      },
      update: {
        description: permission.description,
      },
      create: permission,
    });

    permissionMap.set(`${permission.resource}:${permission.action}`, record.id);
  }

  console.log(`✓ ${permissions.length} permissions seeded`);

  return permissionMap;
};
