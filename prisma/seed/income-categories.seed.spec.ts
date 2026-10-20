import type { PrismaClient } from '../generated/prisma/client';

import { seedIncomeCategories } from './income-categories.seed';

describe('seedIncomeCategories', () => {
  let prisma: {
    incomeCategory: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    prisma = {
      incomeCategory: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create every system category with a normalized name when none exist', async () => {
    prisma.incomeCategory.findFirst.mockResolvedValue(null);

    await seedIncomeCategories(prisma as unknown as PrismaClient);

    expect(prisma.incomeCategory.create).toHaveBeenCalledTimes(8);
    expect(prisma.incomeCategory.create).toHaveBeenCalledWith({
      data: {
        userId: null,
        name: 'Salary',
        normalizedName: 'salary',
      },
    });
  });

  it('should look up each system category by name before creating it', async () => {
    prisma.incomeCategory.findFirst.mockResolvedValue(null);

    await seedIncomeCategories(prisma as unknown as PrismaClient);

    expect(prisma.incomeCategory.findFirst).toHaveBeenCalledWith({
      where: {
        userId: null,
        name: 'Other',
      },
    });
  });

  it('should skip categories that already exist so the seed is idempotent', async () => {
    prisma.incomeCategory.findFirst.mockImplementation(
      ({ where }: { where: { name: string } }) =>
        Promise.resolve(where.name === 'Salary' ? { id: 'existing' } : null),
    );

    await seedIncomeCategories(prisma as unknown as PrismaClient);

    expect(prisma.incomeCategory.create).toHaveBeenCalledTimes(7);
    expect(prisma.incomeCategory.create).not.toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Salary' }),
    });
  });
});
