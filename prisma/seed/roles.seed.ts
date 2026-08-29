import { PrismaClient } from '../generated/prisma/client';

const roles = [
  {
    name: 'SUPER_ADMIN',
    description: 'Full system access',
  },
  {
    name: 'ADMIN',
    description: 'Administrative access',
  },
  {
    name: 'ACCOUNT_MANAGER',
    description: 'Manages customer accounts',
  },
  {
    name: 'CUSTOMER',
    description: 'Standard customer access',
  },
];

export const seedRoles = async (
  prisma: PrismaClient,
): Promise<Map<string, string>> => {
  console.log('Seeding roles...');

  const roleMap = new Map<string, string>();

  for (const role of roles) {
    const record = await prisma.role.upsert({
      where: {
        name: role.name,
      },
      update: {
        description: role.description,
      },
      create: role,
    });

    roleMap.set(role.name, record.id);
  }

  console.log(`✓ ${roles.length} roles seeded`);

  return roleMap;
};
