import { PrismaExpenseCategoryRepository } from './prisma-expense-category.repository';
import { ExpenseCategoryAlreadyExistsException } from '../../presentation/exceptions/expense-category-already-exists.exception';

describe('PrismaExpenseCategoryRepository', () => {
  const prisma = {
    expenseCategory: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    userExpenseCategoryArchive: {
      upsert: jest.fn(),
    },
  };

  const createdAt = new Date('2026-09-20T10:00:00.000Z');
  const updatedAt = new Date('2026-09-20T11:00:00.000Z');

  const createPrismaExpenseCategory = (
    overrides: Partial<{
      id: string;
      userId: string | null;
      name: string;
      createdAt: Date;
      updatedAt: Date;
    }> = {},
  ) => ({
    id: 'category-1',
    userId: 'user-1',
    name: 'Groceries',
    createdAt,
    updatedAt,
    ...overrides,
  });

  let repository: PrismaExpenseCategoryRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    repository = new PrismaExpenseCategoryRepository(prisma as never);
  });

  describe('create', () => {
    it('should create and map a custom expense category', async () => {
      prisma.expenseCategory.create.mockResolvedValue(
        createPrismaExpenseCategory(),
      );

      const result = await repository.create({
        userId: 'user-1',
        name: 'Groceries',
        normalizedName: 'groceries',
      });

      expect(prisma.expenseCategory.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Groceries',
          normalizedName: 'groceries',
        },
      });
      expect(result.id).toBe('category-1');
      expect(result.userId).toBe('user-1');
      expect(result.name).toBe('Groceries');
      expect(result.isSystem).toBe(false);
      expect(result.isArchived).toBe(false);
      expect(result.createdAt).toEqual(createdAt);
      expect(result.updatedAt).toEqual(updatedAt);
    });

    it('should map a unique constraint race to ExpenseCategoryAlreadyExistsException', async () => {
      prisma.expenseCategory.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        repository.create({
          userId: 'user-1',
          name: 'Groceries',
          normalizedName: 'groceries',
        }),
      ).rejects.toBeInstanceOf(ExpenseCategoryAlreadyExistsException);
    });

    it('should rethrow unrelated database errors unchanged', async () => {
      const dbError = new Error('connection lost');
      prisma.expenseCategory.create.mockRejectedValue(dbError);

      await expect(
        repository.create({
          userId: 'user-1',
          name: 'Groceries',
          normalizedName: 'groceries',
        }),
      ).rejects.toBe(dbError);
    });
  });

  describe('findAvailableByNormalizedName', () => {
    it('should search visible categories by normalized name', async () => {
      prisma.expenseCategory.findFirst.mockResolvedValue(
        createPrismaExpenseCategory({ userId: null }),
      );

      const result = await repository.findAvailableByNormalizedName({
        normalizedName: 'groceries',
        userId: 'user-1',
      });

      expect(prisma.expenseCategory.findFirst).toHaveBeenCalledWith({
        where: {
          normalizedName: 'groceries',
          id: undefined,
          OR: [{ userId: null }, { userId: 'user-1' }],
        },
      });
      expect(result?.isSystem).toBe(true);
    });

    it('should exclude the given category id from the lookup', async () => {
      prisma.expenseCategory.findFirst.mockResolvedValue(null);

      const result = await repository.findAvailableByNormalizedName({
        normalizedName: 'groceries',
        userId: 'user-1',
        excludeCategoryId: 'category-1',
      });

      expect(prisma.expenseCategory.findFirst).toHaveBeenCalledWith({
        where: {
          normalizedName: 'groceries',
          id: { not: 'category-1' },
          OR: [{ userId: null }, { userId: 'user-1' }],
        },
      });
      expect(result).toBeNull();
    });
  });

  describe('findByIdAvailableToUser', () => {
    it('should return a system category available to the user', async () => {
      prisma.expenseCategory.findFirst.mockResolvedValue(
        createPrismaExpenseCategory({ userId: null, name: 'Groceries' }),
      );

      const result = await repository.findByIdAvailableToUser(
        'category-1',
        'user-1',
      );

      expect(prisma.expenseCategory.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'category-1',
          archives: { none: { userId: 'user-1' } },
          OR: [{ userId: null }, { userId: 'user-1' }],
        },
      });
      expect(result?.userId).toBeNull();
      expect(result?.isSystem).toBe(true);
    });

    it('should return null when the category is unavailable', async () => {
      prisma.expenseCategory.findFirst.mockResolvedValue(null);

      const result = await repository.findByIdAvailableToUser(
        'category-1',
        'user-2',
      );

      expect(result).toBeNull();
    });
  });

  describe('findAllAvailableToUser', () => {
    it('should page visible, non-archived categories and count the total', async () => {
      prisma.expenseCategory.findMany.mockResolvedValue([
        createPrismaExpenseCategory({ userId: null }),
      ]);
      prisma.expenseCategory.count.mockResolvedValue(15);

      const result = await repository.findAllAvailableToUser({
        userId: 'user-1',
        skip: 10,
        take: 5,
      });

      const expectedWhere = {
        archives: { none: { userId: 'user-1' } },
        OR: [{ userId: null }, { userId: 'user-1' }],
      };

      expect(prisma.expenseCategory.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        skip: 10,
        take: 5,
        orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      });
      expect(prisma.expenseCategory.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
      expect(result.total).toBe(15);
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].isSystem).toBe(true);
    });
  });

  describe('updateCustomCategory', () => {
    it('should update the owned category and return the refreshed entity', async () => {
      prisma.expenseCategory.updateMany.mockResolvedValue({ count: 1 });
      prisma.expenseCategory.findFirst.mockResolvedValue(
        createPrismaExpenseCategory({ name: 'Food' }),
      );

      const result = await repository.updateCustomCategory({
        categoryId: 'category-1',
        userId: 'user-1',
        name: 'Food',
        normalizedName: 'food',
      });

      expect(prisma.expenseCategory.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'category-1',
          userId: 'user-1',
          archives: { none: { userId: 'user-1' } },
        },
        data: { name: 'Food', normalizedName: 'food' },
      });
      expect(result?.name).toBe('Food');
    });

    it('should return null when no owned category matched', async () => {
      prisma.expenseCategory.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.updateCustomCategory({
        categoryId: 'category-1',
        userId: 'user-2',
        name: 'Food',
        normalizedName: 'food',
      });

      expect(result).toBeNull();
      expect(prisma.expenseCategory.findFirst).not.toHaveBeenCalled();
    });

    it('should map a unique constraint race to ExpenseCategoryAlreadyExistsException', async () => {
      prisma.expenseCategory.updateMany.mockRejectedValue({ code: 'P2002' });

      await expect(
        repository.updateCustomCategory({
          categoryId: 'category-1',
          userId: 'user-1',
          name: 'Food',
          normalizedName: 'food',
        }),
      ).rejects.toBeInstanceOf(ExpenseCategoryAlreadyExistsException);
    });
  });

  describe('archiveForUser', () => {
    it('should upsert a per-user archive row and return the category as archived', async () => {
      prisma.expenseCategory.findFirst.mockResolvedValue(
        createPrismaExpenseCategory({ userId: null }),
      );
      prisma.userExpenseCategoryArchive.upsert.mockResolvedValue({});

      const result = await repository.archiveForUser({
        categoryId: 'category-1',
        userId: 'user-1',
      });

      expect(prisma.expenseCategory.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'category-1',
          archives: { none: { userId: 'user-1' } },
          OR: [{ userId: null }, { userId: 'user-1' }],
        },
      });
      expect(prisma.userExpenseCategoryArchive.upsert).toHaveBeenCalledWith({
        where: {
          userId_expenseCategoryId: {
            userId: 'user-1',
            expenseCategoryId: 'category-1',
          },
        },
        create: { userId: 'user-1', expenseCategoryId: 'category-1' },
        update: {},
      });
      expect(result?.isArchived).toBe(true);
      expect(result?.isSystem).toBe(true);
    });

    it('should return null and skip the archive write when the category is not visible', async () => {
      prisma.expenseCategory.findFirst.mockResolvedValue(null);

      const result = await repository.archiveForUser({
        categoryId: 'category-1',
        userId: 'user-2',
      });

      expect(result).toBeNull();
      expect(prisma.userExpenseCategoryArchive.upsert).not.toHaveBeenCalled();
    });
  });
});
