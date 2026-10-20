import { request as expressRequest } from 'express';

import { ExpenseCategory } from '../../domain/entities/expense-category.entity';
import { AuthenticatedRequest } from '../../../auth/infrastructure/interfaces/authenticated-request.interface';

import { ExpenseCategoriesController } from './expense-categories.controller';

const createAuthenticatedRequest = (): AuthenticatedRequest =>
  Object.assign(expressRequest, {
    user: {
      userId: 'user-1',
      email: 'user@example.com',
      sessionId: 'session-1',
    },
  });

describe('ExpenseCategoriesController', () => {
  const createdAt = new Date('2026-09-20T10:00:00.000Z');
  const updatedAt = new Date('2026-09-20T11:00:00.000Z');

  const category = ExpenseCategory.create({
    id: 'category-1',
    userId: 'user-1',
    name: 'Coffee',
    isArchived: false,
    createdAt,
    updatedAt,
  });

  const expenseCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  };

  let controller: ExpenseCategoriesController;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new ExpenseCategoriesController(
      expenseCategoriesService as never,
    );
  });

  describe('create', () => {
    it('should create a category for the authenticated user and wrap the response', async () => {
      expenseCategoriesService.create.mockResolvedValue(category);

      const response = await controller.create(createAuthenticatedRequest(), {
        name: 'Coffee',
      });

      expect(expenseCategoriesService.create).toHaveBeenCalledWith({
        userId: 'user-1',
        name: 'Coffee',
      });
      expect(response).toEqual({
        success: true,
        data: {
          id: 'category-1',
          name: 'Coffee',
          isSystem: false,
          isArchived: false,
          createdAt,
          updatedAt,
        },
        meta: {},
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated categories with pagination meta', async () => {
      expenseCategoriesService.findAll.mockResolvedValue({
        items: [category],
        page: 2,
        limit: 10,
        total: 11,
      });

      const response = await controller.findAll(createAuthenticatedRequest(), {
        page: 2,
        limit: 10,
      });

      expect(expenseCategoriesService.findAll).toHaveBeenCalledWith(
        'user-1',
        2,
        10,
      );
      expect(response.data.items).toHaveLength(1);
      expect(response.meta).toEqual({
        page: 2,
        limit: 10,
        total: 11,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });
  });

  describe('findById', () => {
    it('should return a single category for the authenticated user', async () => {
      expenseCategoriesService.findById.mockResolvedValue(category);

      const response = await controller.findById(
        createAuthenticatedRequest(),
        'category-1',
      );

      expect(expenseCategoriesService.findById).toHaveBeenCalledWith(
        'category-1',
        'user-1',
      );
      expect(response.data.id).toBe('category-1');
    });
  });

  describe('update', () => {
    it('should update the category name for the authenticated user', async () => {
      expenseCategoriesService.update.mockResolvedValue(category);

      await controller.update(createAuthenticatedRequest(), 'category-1', {
        name: 'Coffee',
      });

      expect(expenseCategoriesService.update).toHaveBeenCalledWith({
        categoryId: 'category-1',
        userId: 'user-1',
        name: 'Coffee',
      });
    });
  });

  describe('archive', () => {
    it('should archive the category for the authenticated user', async () => {
      expenseCategoriesService.archive.mockResolvedValue(category);

      await controller.archive(createAuthenticatedRequest(), 'category-1');

      expect(expenseCategoriesService.archive).toHaveBeenCalledWith(
        'category-1',
        'user-1',
      );
    });
  });
});
