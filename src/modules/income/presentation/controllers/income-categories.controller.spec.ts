import { request as expressRequest } from 'express';

import { IncomeCategory } from '../../domain/entities/income-category.entity';
import { AuthenticatedRequest } from '../../../auth/infrastructure/interfaces/authenticated-request.interface';

import { IncomeCategoriesController } from './income-categories.controller';

const createAuthenticatedRequest = (): AuthenticatedRequest =>
  Object.assign(expressRequest, {
    user: {
      userId: 'user-1',
      email: 'user@example.com',
      sessionId: 'session-1',
    },
  });

describe('IncomeCategoriesController', () => {
  const createdAt = new Date('2026-09-20T10:00:00.000Z');
  const updatedAt = new Date('2026-09-20T11:00:00.000Z');

  const category = IncomeCategory.create({
    id: 'category-1',
    userId: 'user-1',
    name: 'Freelance',
    isArchived: false,
    createdAt,
    updatedAt,
  });

  const incomeCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  };

  let controller: IncomeCategoriesController;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new IncomeCategoriesController(
      incomeCategoriesService as never,
    );
  });

  describe('create', () => {
    it('should create a category for the authenticated user and wrap the response', async () => {
      incomeCategoriesService.create.mockResolvedValue(category);

      const response = await controller.create(createAuthenticatedRequest(), {
        name: 'Freelance',
      });

      expect(incomeCategoriesService.create).toHaveBeenCalledWith({
        userId: 'user-1',
        name: 'Freelance',
      });
      expect(response).toEqual({
        success: true,
        data: {
          id: 'category-1',
          name: 'Freelance',
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
      incomeCategoriesService.findAll.mockResolvedValue({
        items: [category],
        page: 2,
        limit: 10,
        total: 11,
      });

      const response = await controller.findAll(createAuthenticatedRequest(), {
        page: 2,
        limit: 10,
      });

      expect(incomeCategoriesService.findAll).toHaveBeenCalledWith(
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
      incomeCategoriesService.findById.mockResolvedValue(category);

      const response = await controller.findById(
        createAuthenticatedRequest(),
        'category-1',
      );

      expect(incomeCategoriesService.findById).toHaveBeenCalledWith(
        'category-1',
        'user-1',
      );
      expect(response.data.id).toBe('category-1');
    });
  });

  describe('update', () => {
    it('should update the category name for the authenticated user', async () => {
      incomeCategoriesService.update.mockResolvedValue(category);

      await controller.update(createAuthenticatedRequest(), 'category-1', {
        name: 'Freelance',
      });

      expect(incomeCategoriesService.update).toHaveBeenCalledWith({
        categoryId: 'category-1',
        userId: 'user-1',
        name: 'Freelance',
      });
    });
  });

  describe('archive', () => {
    it('should archive the category for the authenticated user', async () => {
      incomeCategoriesService.archive.mockResolvedValue(category);

      await controller.archive(createAuthenticatedRequest(), 'category-1');

      expect(incomeCategoriesService.archive).toHaveBeenCalledWith(
        'category-1',
        'user-1',
      );
    });
  });
});
