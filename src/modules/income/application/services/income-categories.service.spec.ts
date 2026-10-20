import { IncomeCategory } from '../../domain/entities/income-category.entity';
import { INCOME_CATEGORY_NAME_MAX_LENGTH } from '../../domain/validations/income-category-validation';

import { IncomeCategoriesService } from './income-categories.service';

import { IncomeCategoryAlreadyExistsException } from '../../presentation/exceptions/income-category-already-exists.exception';
import { IncomeCategoryNotFoundException } from '../../presentation/exceptions/income-category-not-found.exception';
import { InvalidIncomeCategoryException } from '../../presentation/exceptions/invalid-income-category.exception';
import { SystemIncomeCategoryReadOnlyException } from '../../presentation/exceptions/system-income-category-read-only.exception';

describe('IncomeCategoriesService', () => {
  let service: IncomeCategoriesService;

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

  const customCategory = IncomeCategory.create({
    id: 'category-1',
    userId: 'user-1',
    name: 'Freelance',
    isArchived: false,
    createdAt,
    updatedAt,
  });

  const systemCategory = IncomeCategory.create({
    id: 'system-category-1',
    userId: null,
    name: 'Salary',
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

    service = new IncomeCategoriesService(repository);
  });

  describe('create', () => {
    it('should trim the name and create a custom category for the user', async () => {
      repository.create.mockResolvedValue(customCategory);

      const result = await service.create({
        userId: 'user-1',
        name: '  Freelance  ',
      });

      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        name: 'Freelance',
        normalizedName: 'freelance',
      });
      expect(result).toBe(customCategory);
    });

    it('should check for an existing name case-insensitively before creating', async () => {
      repository.findAvailableByNormalizedName.mockResolvedValue(null);
      repository.create.mockResolvedValue(customCategory);

      await service.create({ userId: 'user-1', name: '  FREELANCE  ' });

      expect(repository.findAvailableByNormalizedName).toHaveBeenCalledWith({
        normalizedName: 'freelance',
        userId: 'user-1',
      });
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        name: 'FREELANCE',
        normalizedName: 'freelance',
      });
    });

    it('should reject a name that already exists for the user or as a system category', async () => {
      repository.findAvailableByNormalizedName.mockResolvedValue(
        systemCategory,
      );

      await expect(
        service.create({ userId: 'user-1', name: 'salary' }),
      ).rejects.toBeInstanceOf(IncomeCategoryAlreadyExistsException);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject an empty name after trimming', async () => {
      await expect(
        service.create({ userId: 'user-1', name: '   ' }),
      ).rejects.toBeInstanceOf(InvalidIncomeCategoryException);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject a name longer than the maximum length', async () => {
      await expect(
        service.create({
          userId: 'user-1',
          name: 'a'.repeat(INCOME_CATEGORY_NAME_MAX_LENGTH + 1),
        }),
      ).rejects.toBeInstanceOf(InvalidIncomeCategoryException);

      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return the first page of categories available to the user', async () => {
      repository.findAllAvailableToUser.mockResolvedValue({
        categories: [systemCategory, customCategory],
        total: 2,
      });

      const result = await service.findAll('user-1', 1, 20);

      expect(repository.findAllAvailableToUser).toHaveBeenCalledWith({
        userId: 'user-1',
        skip: 0,
        take: 20,
      });
      expect(result).toEqual({
        items: [systemCategory, customCategory],
        page: 1,
        limit: 20,
        total: 2,
      });
    });

    it('should calculate the skip value for later pages', async () => {
      repository.findAllAvailableToUser.mockResolvedValue({
        categories: [],
        total: 25,
      });

      const result = await service.findAll('user-1', 3, 10);

      expect(repository.findAllAvailableToUser).toHaveBeenCalledWith({
        userId: 'user-1',
        skip: 20,
        take: 10,
      });
      expect(result.page).toBe(3);
    });
  });

  describe('findById', () => {
    it('should return a category available to the user', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(customCategory);

      const result = await service.findById('category-1', 'user-1');

      expect(repository.findByIdAvailableToUser).toHaveBeenCalledWith(
        'category-1',
        'user-1',
      );
      expect(result).toBe(customCategory);
    });

    it('should throw not found when the category is not available to the user', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(null);

      await expect(
        service.findById('category-1', 'user-1'),
      ).rejects.toBeInstanceOf(IncomeCategoryNotFoundException);
    });
  });

  describe('update', () => {
    it('should trim the name and update a custom category', async () => {
      const updated = IncomeCategory.create({
        id: 'category-1',
        userId: 'user-1',
        name: 'Consulting',
        isArchived: false,
        createdAt,
        updatedAt,
      });

      repository.findByIdAvailableToUser.mockResolvedValue(customCategory);
      repository.updateCustomCategory.mockResolvedValue(updated);

      const result = await service.update({
        categoryId: 'category-1',
        userId: 'user-1',
        name: '  Consulting  ',
      });

      expect(repository.updateCustomCategory).toHaveBeenCalledWith({
        categoryId: 'category-1',
        userId: 'user-1',
        name: 'Consulting',
        normalizedName: 'consulting',
      });
      expect(result).toBe(updated);
    });

    it('should reject an invalid name without touching the repository', async () => {
      await expect(
        service.update({
          categoryId: 'category-1',
          userId: 'user-1',
          name: '',
        }),
      ).rejects.toBeInstanceOf(InvalidIncomeCategoryException);

      expect(repository.findByIdAvailableToUser).not.toHaveBeenCalled();
      expect(repository.updateCustomCategory).not.toHaveBeenCalled();
    });

    it('should throw not found when the category is not available to the user', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(null);

      await expect(
        service.update({
          categoryId: 'category-1',
          userId: 'user-1',
          name: 'Consulting',
        }),
      ).rejects.toBeInstanceOf(IncomeCategoryNotFoundException);

      expect(repository.updateCustomCategory).not.toHaveBeenCalled();
    });

    it('should reject updates to system categories', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(systemCategory);

      await expect(
        service.update({
          categoryId: 'system-category-1',
          userId: 'user-1',
          name: 'Renamed',
        }),
      ).rejects.toBeInstanceOf(SystemIncomeCategoryReadOnlyException);

      expect(repository.updateCustomCategory).not.toHaveBeenCalled();
    });

    it('should throw not found when the repository reports no updated row', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(customCategory);
      repository.updateCustomCategory.mockResolvedValue(null);

      await expect(
        service.update({
          categoryId: 'category-1',
          userId: 'user-1',
          name: 'Consulting',
        }),
      ).rejects.toBeInstanceOf(IncomeCategoryNotFoundException);
    });
  });

  describe('name uniqueness on update', () => {
    it('should reject renaming to a name another category already uses', async () => {
      const otherCategory = IncomeCategory.create({
        id: 'category-2',
        userId: 'user-1',
        name: 'Consulting',
        isArchived: false,
        createdAt,
        updatedAt,
      });

      repository.findByIdAvailableToUser.mockResolvedValue(customCategory);
      repository.findAvailableByNormalizedName.mockResolvedValue(otherCategory);

      await expect(
        service.update({
          categoryId: 'category-1',
          userId: 'user-1',
          name: 'consulting',
        }),
      ).rejects.toBeInstanceOf(IncomeCategoryAlreadyExistsException);

      expect(repository.updateCustomCategory).not.toHaveBeenCalled();
    });

    it('should exclude the category being renamed from the duplicate check', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(customCategory);
      repository.findAvailableByNormalizedName.mockResolvedValue(null);
      repository.updateCustomCategory.mockResolvedValue(customCategory);

      await service.update({
        categoryId: 'category-1',
        userId: 'user-1',
        name: 'Freelance',
      });

      expect(repository.findAvailableByNormalizedName).toHaveBeenCalledWith({
        normalizedName: 'freelance',
        userId: 'user-1',
        excludeCategoryId: 'category-1',
      });
    });
  });

  describe('archive', () => {
    it('should archive a custom category for the user', async () => {
      const archived = IncomeCategory.create({
        id: 'category-1',
        userId: 'user-1',
        name: 'Freelance',
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

    it('should archive a system category for the user only', async () => {
      const archived = IncomeCategory.create({
        id: 'system-category-1',
        userId: null,
        name: 'Salary',
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
      expect(result).toBe(archived);
    });

    it('should throw not found when the category is not available to the user', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(null);

      await expect(
        service.archive('category-1', 'user-1'),
      ).rejects.toBeInstanceOf(IncomeCategoryNotFoundException);

      expect(repository.archiveForUser).not.toHaveBeenCalled();
    });

    it('should throw not found when the repository reports no archived row', async () => {
      repository.findByIdAvailableToUser.mockResolvedValue(customCategory);
      repository.archiveForUser.mockResolvedValue(null);

      await expect(
        service.archive('category-1', 'user-1'),
      ).rejects.toBeInstanceOf(IncomeCategoryNotFoundException);
    });
  });
});
