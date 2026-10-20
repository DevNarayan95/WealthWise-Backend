import { PrismaClient } from '../generated/prisma/client';

const systemExpenseCategories = [
  'Groceries',
  'House rent',
  'Electricity',
  'Water',
  'Internet',
  'Mobile',
  'Transport',
  'Medical bills',
  'Education',
  'Dining',
  'Shopping',
  'Entertainment',
  'Insurance',
  'Loan EMI',
  'Other',
];

export const seedExpenseCategories = async (
  prisma: PrismaClient,
): Promise<void> => {
  console.log('Seeding system expense categories...');

  const seedExpenseCategoryName = async (name: string): Promise<void> => {
    const existing = await prisma.expenseCategory.findFirst({
      where: {
        userId: null,
        name,
      },
    });

    if (!existing) {
      await prisma.expenseCategory.create({
        data: {
          userId: null,
          name,
          normalizedName: name.toLowerCase(),
        },
      });
    }
  };

  for (const name of systemExpenseCategories) {
    await seedExpenseCategoryName(name);
  }

  console.log(
    `✓ ${systemExpenseCategories.length} system expense categories seeded`,
  );
};
