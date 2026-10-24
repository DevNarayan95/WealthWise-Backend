import { ExpenseCategory } from '../../domain/entities/expense-category.entity';
import { EXPENSE_CATEGORY_NAME_MAX_LENGTH } from '../../domain/validations/expense-category-validation';

import { ExpenseCategoriesService } from './expense-categories.service';

import { ExportLimitExceededException } from '../../../../common/export/exceptions/export-limit-exceeded.exception';
import { getExportRowLimit } from '../../../../common/export/export-limit';
import { ExpenseCategoryAlreadyExistsException } from '../../presentation/exceptions/expense-category-already-exists.exception';
import { ExpenseCategoryNotFoundException } from '../../presentation/exceptions/expense-category-not-found.exception';
import { InvalidExpenseCategoryException } from '../../presentation/exceptions/invalid-expense-category.exception';
import { SystemExpenseCategoryReadOnlyException } from '../../presentation/exceptions/system-expense-category-read-only.exception';

describe('ExpenseCategoriesService', () => {
  let service: ExpenseCategoriesService;

  let repository: {
    create: jest.Mock;
    findAvailableByNormalizedName: jest.Mock;
    findByIdAvailableToUser: jest.Mock;
    findAllAvailableToUser: jest.Mock;
    updateCustomCategory: jest.Mock;
    archiveForUser: jest.Mock;
  };

  const createdAt = new Date('2026-09-20T10:00:00.000Z');
  const updatedAt = new Date('2026-09-20T11:00:00.000Z');

  const customCategory = ExpenseCategory.create({
    id: 'category-1',
    userId: 'user-1',
    name: 'Gym',
    isArchived: false,
    createdAt,
    updatedAt,
  });

  const systemCategory = ExpenseCategory.create({
    id: 'system-category-1',
    userId: null,
    name: 'Groceries',
    isArchived: false,
    createdAt,
    updatedAt,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    repository = {
      create: jest.fn(),
      findAvailableByNormalizedName: jest.fn(),
      findByIdAvailableToUser: jest.fn(),
      findAllAvailableToUser: jest.fn(),
      updateCustomCategory: jest.fn(),
      archiveForUser: jest.fn(),
    };

    service = new ExpenseCategoriesService(repository);
  });

  describe('create', () => {
    it('should trim the name and create a custom category for the user', async () => {
      repository.findAvailableByNormalizedName.mockResolvedValue(null);
      repository.create.mockResolvedValue(customCategory);

      const result = await service.create({
        userId: 'user-1',
        name: '  Gym  ',
      });

      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        name: 'Gym',
        normalizedName: 'gym',
      });
      expect(result).toBe(customCategory);
    });

    it('should check for an existing name case-insensitively before creating', async () => {
      repository.findAvailableByNormalizedName.mockResolvedValue(null);
      repository.create.mockResolvedValue(customCategory);

      await service.create({ userId: 'user-1', name: '  GYM  ' });

      expect(repository.findAvailableByNormalizedName).toHaveBeenCalledWith({
        normalizedName: 'gym',
        userId: 'user-1',
      });
    });

    it('should reject a duplicate name visible to the user', async () => {
      repository.findAvailableByNormalizedName.mockResolvedValue(
        systemCategory,
      );

      await expect(
        service.create({ userId: 'user-1', name: 'groceries' }),
      ).rejects.toBeInstanceOf(ExpenseCategoryAlreadyExistsException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject an empty name', async () => {
      await expect(
        service.create({ userId: 'user-1', name: '   ' }),
      ).rejects.toBeInstanceOf(InvalidExpenseCategoryException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject a name longer than the configured maximum', async () => {
      await expect(
        service.create({
          userId: 'user-1',
          name: 'a'.repeat(EXPENSE_CATEGORY_NAME_MAX_LENGTH + 1),
        }),
      ).rejects.toThrow(
        `Expense category name must be between 1 and ${EXPENSE_CATEGORY_NAME_MAX_LENGTH} characters`,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should convert page and limit into skip and take', async () => {
      repository.findAllAvailableToUser.mockResolvedValue({
        categories: [systemCategory, customCategory],
        total: 17,
      });

      const result = await service.findAll('user-1', 3, 5);

      expect(repository.findAllAvailableToUser).toHaveBeenCalledWith({
        userId: 'user-1',
        skip: 10,
        take: 5,
      });
      expect(result).toEqual({
        items: [systemCategory, customCategory],
        page: 3,
        limit: 5,
        total: 17,
      });
    });
  });

  describe('findAllForExport', () => {
    it('should load all categories available to the user up to the export limit plus one', async () => {
      repository.findAllAvailableToUser.mockResolvedValue({
        categories: [customCategory, systemCategory],
        total: 2,
      });

      const result = await service.findAllForExport('user-1');

      expect(result).toEqual([customCategory, systemCategory]);
      expect(repository.findAllAvailableToUser).toHaveBeenCalledWith({
        userId: 'user-1',
        skip: 0,
        take: getExportRowLimit() + 1,
      });
    });

    it('should reject an export that exceeds the row limit', async () => {
      const categories = Array.from(
        { length: getExportRowLimit() + 1 },
        () => customCategory,
      );
      repository.findAllAvailableToUser.mockResolvedValue({
        categories,
        total: categories.length,
      });

      await expect(service.findAllForExport('user-1')).rejects.toThrow(
        ExportLimitExceededException,
      );
    });
  });

  describe('findById', () => {
    it('should return a category visible to the user', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(customCategory);

      const result = await service.findById('category-1', 'user-1');

      expect(repository.findByIdAvailableToUser).toHaveBeenCalledWith(
        'category-1',
        'user-1',
      );
      expect(result).toBe(customCategory);
    });

    it('should throw not found when the category is not visible to the user', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(null);

      await expect(
        service.findById('category-404', 'user-1'),
      ).rejects.toBeInstanceOf(ExpenseCategoryNotFoundException);
    });
  });

  describe('update', () => {
    it('should rename a custom category owned by the user', async () => {
      const renamed = ExpenseCategory.create({
        id: 'category-1',
        userId: 'user-1',
        name: 'Fitness',
        isArchived: false,
        createdAt,
        updatedAt,
      });
      repository.findByIdAvailableToUser.mockResolvedValue(customCategory);
      repository.findAvailableByNormalizedName.mockResolvedValue(null);
      repository.updateCustomCategory.mockResolvedValue(renamed);

      const result = await service.update({
        categoryId: 'category-1',
        userId: 'user-1',
        name: '  Fitness  ',
      });

      expect(repository.findAvailableByNormalizedName).toHaveBeenCalledWith({
        normalizedName: 'fitness',
        userId: 'user-1',
        excludeCategoryId: 'category-1',
      });
      expect(repository.updateCustomCategory).toHaveBeenCalledWith({
        categoryId: 'category-1',
        userId: 'user-1',
        name: 'Fitness',
        normalizedName: 'fitness',
      });
      expect(result).toBe(renamed);
    });

    it('should forbid renaming a system category', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(systemCategory);

      await expect(
        service.update({
          categoryId: 'system-category-1',
          userId: 'user-1',
          name: 'Food',
        }),
      ).rejects.toBeInstanceOf(SystemExpenseCategoryReadOnlyException);
      expect(repository.updateCustomCategory).not.toHaveBeenCalled();
    });

    it('should reject a rename that collides with a visible name', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(customCategory);
      repository.findAvailableByNormalizedName.mockResolvedValue(
        systemCategory,
      );

      await expect(
        service.update({
          categoryId: 'category-1',
          userId: 'user-1',
          name: 'Groceries',
        }),
      ).rejects.toBeInstanceOf(ExpenseCategoryAlreadyExistsException);
      expect(repository.updateCustomCategory).not.toHaveBeenCalled();
    });

    it('should reject an invalid name before touching the repository', async () => {
      await expect(
        service.update({
          categoryId: 'category-1',
          userId: 'user-1',
          name: ' ',
        }),
      ).rejects.toBeInstanceOf(InvalidExpenseCategoryException);
      expect(repository.findByIdAvailableToUser).not.toHaveBeenCalled();
    });

    it('should throw not found when the category is not visible to the user', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(null);

      await expect(
        service.update({
          categoryId: 'category-404',
          userId: 'user-1',
          name: 'Gym',
        }),
      ).rejects.toBeInstanceOf(ExpenseCategoryNotFoundException);
    });

    it('should throw not found when the owner check fails during update', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(customCategory);
      repository.findAvailableByNormalizedName.mockResolvedValue(null);
      repository.updateCustomCategory.mockResolvedValue(null);

      await expect(
        service.update({
          categoryId: 'category-1',
          userId: 'user-1',
          name: 'Fitness',
        }),
      ).rejects.toBeInstanceOf(ExpenseCategoryNotFoundException);
    });
  });

  describe('archive', () => {
    it('should archive a custom category for the user', async () => {
      const archived = ExpenseCategory.create({
        id: 'category-1',
        userId: 'user-1',
        name: 'Gym',
        isArchived: true,
        createdAt,
        updatedAt,
      });
      repository.findByIdAvailableToUser.mockResolvedValue(customCategory);
      repository.archiveForUser.mockResolvedValue(archived);

      const result = await service.archive('category-1', 'user-1');

      expect(repository.archiveForUser).toHaveBeenCalledWith({
        categoryId: 'category-1',
        userId: 'user-1',
      });
      expect(result).toBe(archived);
    });

    it('should allow archiving a system category for the requesting user', async () => {
      const archived = ExpenseCategory.create({
        id: 'system-category-1',
        userId: null,
        name: 'Groceries',
        isArchived: true,
        createdAt,
        updatedAt,
      });
      repository.findByIdAvailableToUser.mockResolvedValue(systemCategory);
      repository.archiveForUser.mockResolvedValue(archived);

      const result = await service.archive('system-category-1', 'user-1');

      expect(repository.archiveForUser).toHaveBeenCalledWith({
        categoryId: 'system-category-1',
        userId: 'user-1',
      });
      expect(result.isArchived).toBe(true);
    });

    it('should throw not found when the category is not visible to the user', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(null);

      await expect(
        service.archive('category-404', 'user-1'),
      ).rejects.toBeInstanceOf(ExpenseCategoryNotFoundException);
      expect(repository.archiveForUser).not.toHaveBeenCalled();
    });

    it('should throw not found when the archive operation returns nothing', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(customCategory);
      repository.archiveForUser.mockResolvedValue(null);

      await expect(
        service.archive('category-1', 'user-1'),
      ).rejects.toBeInstanceOf(ExpenseCategoryNotFoundException);
    });
  });
});
