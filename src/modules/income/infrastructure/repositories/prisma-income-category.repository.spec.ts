import { PrismaIncomeCategoryRepository } from './prisma-income-category.repository';

describe('PrismaIncomeCategoryRepository', () => {
  const prisma = {
    incomeCategory: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const createdAt = new Date('2026-09-20T10:00:00.000Z');
  const updatedAt = new Date('2026-09-20T11:00:00.000Z');

  const createPrismaIncomeCategory = (
    overrides: Partial<{
      id: string;
      userId: string | null;
      name: string;
      isArchived: boolean;
      createdAt: Date;
      updatedAt: Date;
    }> = {},
  ) => ({
    id: 'category-1',
    userId: 'user-1',
    name: 'Salary',
    isArchived: false,
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
      });

      expect(prisma.incomeCategory.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Salary',
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
          isArchived: false,
          OR: [{ userId: null }, { userId: 'user-1' }],
        },
      });

      expect(result).not.toBeNull();
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
          isArchived: false,
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
        isArchived: false,
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

    it('should exclude archived categories and categories owned by other users', async () => {
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
            isArchived: false,
            OR: [{ userId: null }, { userId: 'user-1' }],
          },
        }),
      );
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
      });

      expect(prisma.incomeCategory.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'category-1',
          userId: 'user-1',
          isArchived: false,
        },
        data: {
          name: 'Bonus',
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
      });

      expect(result).toBeNull();
      expect(prisma.incomeCategory.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('archiveCustomCategory', () => {
    it('should archive a custom category owned by the user', async () => {
      prisma.incomeCategory.updateMany.mockResolvedValue({ count: 1 });
      prisma.incomeCategory.findFirst.mockResolvedValue(
        createPrismaIncomeCategory({
          isArchived: true,
        }),
      );

      const result = await repository.archiveCustomCategory({
        categoryId: 'category-1',
        userId: 'user-1',
      });

      expect(prisma.incomeCategory.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'category-1',
          userId: 'user-1',
          isArchived: false,
        },
        data: {
          isArchived: true,
        },
      });

      expect(result?.isArchived).toBe(true);
    });

    it('should return null when the category cannot be archived', async () => {
      prisma.incomeCategory.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.archiveCustomCategory({
        categoryId: 'category-1',
        userId: 'user-2',
      });

      expect(result).toBeNull();
      expect(prisma.incomeCategory.findFirst).not.toHaveBeenCalled();
    });
  });
});
