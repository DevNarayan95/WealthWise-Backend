import { PrismaIncomeCategoryRepository } from './prisma-income-category.repository';
import { IncomeCategoryAlreadyExistsException } from '../../presentation/exceptions/income-category-already-exists.exception';

describe('PrismaIncomeCategoryRepository', () => {
  const prisma = {
    incomeCategory: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    userIncomeCategoryArchive: {
      upsert: jest.fn(),
    },
  };

  const createdAt = new Date('2026-09-20T10:00:00.000Z');
  const updatedAt = new Date('2026-09-20T11:00:00.000Z');

  const createPrismaIncomeCategory = (
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
    name: 'Salary',
    createdAt,
    updatedAt,
    ...overrides,
  });

  let repository: PrismaIncomeCategoryRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    repository = new PrismaIncomeCategoryRepository(prisma as never);
  });

  describe('create', () => {
    it('should create and map a custom income category', async () => {
      prisma.incomeCategory.create.mockResolvedValue(
        createPrismaIncomeCategory(),
      );

      const result = await repository.create({
        userId: 'user-1',
        name: 'Salary',
        normalizedName: 'salary',
      });

      expect(prisma.incomeCategory.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Salary',
          normalizedName: 'salary',
        },
      });

      expect(result.id).toBe('category-1');
      expect(result.userId).toBe('user-1');
      expect(result.name).toBe('Salary');
      expect(result.isSystem).toBe(false);
      expect(result.isArchived).toBe(false);
      expect(result.createdAt).toEqual(createdAt);
      expect(result.updatedAt).toEqual(updatedAt);
    });

    it('should map a unique constraint race to IncomeCategoryAlreadyExistsException', async () => {
      prisma.incomeCategory.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        repository.create({
          userId: 'user-1',
          name: 'Salary',
          normalizedName: 'salary',
        }),
      ).rejects.toBeInstanceOf(IncomeCategoryAlreadyExistsException);
    });

    it('should rethrow unrelated database errors unchanged', async () => {
      const dbError = new Error('connection lost');
      prisma.incomeCategory.create.mockRejectedValue(dbError);

      await expect(
        repository.create({
          userId: 'user-1',
          name: 'Salary',
          normalizedName: 'salary',
        }),
      ).rejects.toBe(dbError);
    });
  });

  describe('findByIdAvailableToUser', () => {
    it('should return a system category available to the user', async () => {
      prisma.incomeCategory.findFirst.mockResolvedValue(
        createPrismaIncomeCategory({
          userId: null,
          name: 'Investment Income',
        }),
      );

      const result = await repository.findByIdAvailableToUser(
        'category-1',
        'user-1',
      );

      expect(prisma.incomeCategory.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'category-1',
          archives: { none: { userId: 'user-1' } },
          OR: [{ userId: null }, { userId: 'user-1' }],
        },
      });
      expect(result?.userId).toBeNull();
      expect(result?.isSystem).toBe(true);
      expect(result?.name).toBe('Investment Income');
    });

    it('should return a custom category owned by the user', async () => {
      prisma.incomeCategory.findFirst.mockResolvedValue(
        createPrismaIncomeCategory(),
      );

      const result = await repository.findByIdAvailableToUser(
        'category-1',
        'user-1',
      );

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user-1');
      expect(result?.isSystem).toBe(false);
    });

    it('should return null when the category is unavailable', async () => {
      prisma.incomeCategory.findFirst.mockResolvedValue(null);

      const result = await repository.findByIdAvailableToUser(
        'category-1',
        'user-2',
      );

      expect(result).toBeNull();

      expect(prisma.incomeCategory.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'category-1',
          archives: { none: { userId: 'user-2' } },
          OR: [{ userId: null }, { userId: 'user-2' }],
        },
      });
    });
  });

  describe('findAllAvailableToUser', () => {
    it('should return paginated system and user categories with total count', async () => {
      prisma.incomeCategory.findMany.mockResolvedValue([
        createPrismaIncomeCategory({
          id: 'category-1',
          name: 'Salary',
        }),
        createPrismaIncomeCategory({
          id: 'category-2',
          userId: null,
          name: 'Investment Income',
        }),
      ]);

      prisma.incomeCategory.count.mockResolvedValue(12);

      const result = await repository.findAllAvailableToUser({
        userId: 'user-1',
        skip: 10,
        take: 5,
      });

      const expectedWhere = {
        archives: { none: { userId: 'user-1' } },
        OR: [{ userId: null }, { userId: 'user-1' }],
      };

      expect(prisma.incomeCategory.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        skip: 10,
        take: 5,
        orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      });

      expect(prisma.incomeCategory.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });

      expect(result.total).toBe(12);
      expect(result.categories).toHaveLength(2);
      expect(result.categories[0]?.name).toBe('Salary');
      expect(result.categories[1]?.isSystem).toBe(true);
    });

    it('should return an empty page when no categories exist', async () => {
      prisma.incomeCategory.findMany.mockResolvedValue([]);
      prisma.incomeCategory.count.mockResolvedValue(0);

      const result = await repository.findAllAvailableToUser({
        userId: 'user-1',
        skip: 0,
        take: 20,
      });

      expect(result.categories).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should exclude categories archived by the user and categories owned by other users', async () => {
      prisma.incomeCategory.findMany.mockResolvedValue([]);
      prisma.incomeCategory.count.mockResolvedValue(0);

      await repository.findAllAvailableToUser({
        userId: 'user-1',
        skip: 0,
        take: 20,
      });

      expect(prisma.incomeCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            archives: { none: { userId: 'user-1' } },
            OR: [{ userId: null }, { userId: 'user-1' }],
          },
        }),
      );
    });
  });

  describe('findAvailableByNormalizedName', () => {
    it('should find a name owned by the user or a system category, excluding the given category', async () => {
      prisma.incomeCategory.findFirst.mockResolvedValue(
        createPrismaIncomeCategory({ userId: null, name: 'Salary' }),
      );

      const result = await repository.findAvailableByNormalizedName({
        normalizedName: 'salary',
        userId: 'user-1',
        excludeCategoryId: 'category-2',
      });

      expect(prisma.incomeCategory.findFirst).toHaveBeenCalledWith({
        where: {
          normalizedName: 'salary',
          id: { not: 'category-2' },
          OR: [{ userId: null }, { userId: 'user-1' }],
        },
      });
      expect(result?.name).toBe('Salary');
    });

    it('should not exclude any category when no exclusion is given', async () => {
      prisma.incomeCategory.findFirst.mockResolvedValue(null);

      const result = await repository.findAvailableByNormalizedName({
        normalizedName: 'bonus',
        userId: 'user-1',
      });

      expect(prisma.incomeCategory.findFirst).toHaveBeenCalledWith({
        where: {
          normalizedName: 'bonus',
          id: undefined,
          OR: [{ userId: null }, { userId: 'user-1' }],
        },
      });
      expect(result).toBeNull();
    });
  });

  describe('updateCustomCategory', () => {
    it('should update a custom category owned by the user', async () => {
      prisma.incomeCategory.updateMany.mockResolvedValue({ count: 1 });
      prisma.incomeCategory.findFirst.mockResolvedValue(
        createPrismaIncomeCategory({
          name: 'Bonus',
        }),
      );

      const result = await repository.updateCustomCategory({
        categoryId: 'category-1',
        userId: 'user-1',
        name: 'Bonus',
        normalizedName: 'bonus',
      });

      expect(prisma.incomeCategory.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'category-1',
          userId: 'user-1',
          archives: { none: { userId: 'user-1' } },
        },
        data: {
          name: 'Bonus',
          normalizedName: 'bonus',
        },
      });

      expect(result?.name).toBe('Bonus');
      expect(result?.userId).toBe('user-1');
    });

    it('should return null when the category cannot be updated', async () => {
      prisma.incomeCategory.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.updateCustomCategory({
        categoryId: 'category-1',
        userId: 'user-2',
        name: 'Bonus',
        normalizedName: 'bonus',
      });

      expect(result).toBeNull();
      expect(prisma.incomeCategory.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('archiveForUser', () => {
    it('should record a per-user archive for a category visible to the user and return it as archived', async () => {
      prisma.incomeCategory.findFirst.mockResolvedValue(
        createPrismaIncomeCategory({ userId: null, name: 'Salary' }),
      );
      prisma.userIncomeCategoryArchive.upsert.mockResolvedValue({});

      const result = await repository.archiveForUser({
        categoryId: 'category-1',
        userId: 'user-1',
      });

      expect(prisma.incomeCategory.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'category-1',
          archives: { none: { userId: 'user-1' } },
          OR: [{ userId: null }, { userId: 'user-1' }],
        },
      });
      expect(prisma.userIncomeCategoryArchive.upsert).toHaveBeenCalledWith({
        where: {
          userId_incomeCategoryId: {
            userId: 'user-1',
            incomeCategoryId: 'category-1',
          },
        },
        create: { userId: 'user-1', incomeCategoryId: 'category-1' },
        update: {},
      });

      expect(result?.id).toBe('category-1');
      expect(result?.isSystem).toBe(true);
      expect(result?.isArchived).toBe(true);
    });

    it('should return null and record nothing when the category is not visible to the user', async () => {
      prisma.incomeCategory.findFirst.mockResolvedValue(null);

      const result = await repository.archiveForUser({
        categoryId: 'category-1',
        userId: 'user-2',
      });

      expect(result).toBeNull();
      expect(prisma.userIncomeCategoryArchive.upsert).not.toHaveBeenCalled();
    });
  });
});
