import { PrismaClient } from '../generated/prisma/client';

const systemIncomeCategories = [
  'Salary',
  'Business',
  'Freelance',
  'Interest',
  'Interest from FD',
  'Dividends',
  'Capital Gains',
  'Rental',
  'Gifts',
  'Refunds',
  'Other',
];

export const seedIncomeCategories = async (
  prisma: PrismaClient,
): Promise<void> => {
  console.log('Seeding system income categories...');

  const seedIncomeCategoryName = async (name: string): Promise<void> => {
    const existing = await prisma.incomeCategory.findFirst({
      where: {
        userId: null,
        name,
      },
    });

    if (!existing) {
      await prisma.incomeCategory.create({
        data: {
          userId: null,
          name,
          normalizedName: name.toLowerCase(),
        },
      });
    }
  };

  for (const name of systemIncomeCategories) {
    await seedIncomeCategoryName(name);
  }

  console.log(
    `✓ ${systemIncomeCategories.length} system income categories seeded`,
  );
};
