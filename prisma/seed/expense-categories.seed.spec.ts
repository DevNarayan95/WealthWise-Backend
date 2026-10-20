import type { PrismaClient } from '../generated/prisma/client';

import { seedExpenseCategories } from './expense-categories.seed';

describe('seedExpenseCategories', () => {
  let prisma: {
    expenseCategory: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    prisma = {
      expenseCategory: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create all 15 system categories with a normalized name when none exist', async () => {
    prisma.expenseCategory.findFirst.mockResolvedValue(null);

    await seedExpenseCategories(prisma as unknown as PrismaClient);

    expect(prisma.expenseCategory.create).toHaveBeenCalledTimes(15);
    expect(prisma.expenseCategory.create).toHaveBeenCalledWith({
      data: {
        userId: null,
        name: 'Groceries',
        normalizedName: 'groceries',
      },
    });
  });

  it('should seed the Loan EMI system category used by loan transactions', async () => {
    prisma.expenseCategory.findFirst.mockResolvedValue(null);

    await seedExpenseCategories(prisma as unknown as PrismaClient);

    expect(prisma.expenseCategory.create).toHaveBeenCalledWith({
      data: {
        userId: null,
        name: 'Loan EMI',
        normalizedName: 'loan emi',
      },
    });
  });

  it('should look up each system category by name before creating it', async () => {
    prisma.expenseCategory.findFirst.mockResolvedValue(null);

    await seedExpenseCategories(prisma as unknown as PrismaClient);

    expect(prisma.expenseCategory.findFirst).toHaveBeenCalledWith({
      where: {
        userId: null,
        name: 'Other',
      },
    });
  });

  it('should skip categories that already exist so the seed is idempotent', async () => {
    prisma.expenseCategory.findFirst.mockImplementation(
      ({ where }: { where: { name: string } }) =>
        Promise.resolve(where.name === 'Groceries' ? { id: 'existing' } : null),
    );

    await seedExpenseCategories(prisma as unknown as PrismaClient);

    expect(prisma.expenseCategory.create).toHaveBeenCalledTimes(14);
    expect(prisma.expenseCategory.create).not.toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Groceries' }),
    });
  });
});
