import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ExpenseCategory } from '../../domain/entities/expense-category.entity';
import { ExpenseCategoryAlreadyExistsException } from '../../presentation/exceptions/expense-category-already-exists.exception';

import {
  ArchiveExpenseCategoryRepositoryInput,
  CreateExpenseCategoryRepositoryInput,
  ExpenseCategoryRepository,
  FindExpenseCategoriesRepositoryInput,
  FindExpenseCategoriesRepositoryOutput,
  FindExpenseCategoryByNormalizedNameRepositoryInput,
  UpdateExpenseCategoryRepositoryInput,
} from '../../domain/repositories/expense-category.repository';

@Injectable()
export class PrismaExpenseCategoryRepository extends ExpenseCategoryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateExpenseCategoryRepositoryInput,
  ): Promise<ExpenseCategory> {
    try {
      const category = await this.prisma.expenseCategory.create({
        data: {
          userId: input.userId,
          name: input.name,
          normalizedName: input.normalizedName,
        },
      });

      return this.toDomain(category);
    } catch (error) {
      throw this.mapUniqueViolation(error);
    }
  }

  async findAvailableByNormalizedName(
    input: FindExpenseCategoryByNormalizedNameRepositoryInput,
  ): Promise<ExpenseCategory | null> {
    const category = await this.prisma.expenseCategory.findFirst({
      where: {
        normalizedName: input.normalizedName,
        id: input.excludeCategoryId
          ? { not: input.excludeCategoryId }
          : undefined,
        OR: [{ userId: null }, { userId: input.userId }],
      },
    });

    return category ? this.toDomain(category) : null;
  }

  async findByIdAvailableToUser(
    categoryId: string,
    userId: string,
  ): Promise<ExpenseCategory | null> {
    const category = await this.prisma.expenseCategory.findFirst({
      where: {
        id: categoryId,
        archives: { none: { userId } },
        OR: [{ userId: null }, { userId }],
      },
    });

    return category ? this.toDomain(category) : null;
  }

  async findAllAvailableToUser(
    input: FindExpenseCategoriesRepositoryInput,
  ): Promise<FindExpenseCategoriesRepositoryOutput> {
    const where = {
      archives: { none: { userId: input.userId } },
      OR: [{ userId: null }, { userId: input.userId }],
    };

    const categories = await this.prisma.expenseCategory.findMany({
      where,
      skip: input.skip,
      take: input.take,
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    });

    const total = await this.prisma.expenseCategory.count({
      where,
    });

    return {
      categories: categories.map((category) => this.toDomain(category)),
      total,
    };
  }

  async updateCustomCategory(
    input: UpdateExpenseCategoryRepositoryInput,
  ): Promise<ExpenseCategory | null> {
    let result: { count: number };
    try {
      result = await this.prisma.expenseCategory.updateMany({
        where: {
          id: input.categoryId,
          userId: input.userId,
          archives: { none: { userId: input.userId } },
        },
        data: {
          name: input.name,
          normalizedName: input.normalizedName,
        },
      });
    } catch (error) {
      throw this.mapUniqueViolation(error);
    }

    if (result.count === 0) {
      return null;
    }

    const category = await this.prisma.expenseCategory.findFirst({
      where: {
        id: input.categoryId,
        userId: input.userId,
        archives: { none: { userId: input.userId } },
      },
    });

    return category ? this.toDomain(category) : null;
  }

  async archiveForUser(
    input: ArchiveExpenseCategoryRepositoryInput,
  ): Promise<ExpenseCategory | null> {
    const category = await this.prisma.expenseCategory.findFirst({
      where: {
        id: input.categoryId,
        archives: { none: { userId: input.userId } },
        OR: [{ userId: null }, { userId: input.userId }],
      },
    });

    if (!category) {
      return null;
    }

    // Upsert keeps a concurrent double-archive idempotent instead of failing on the composite key.
    await this.prisma.userExpenseCategoryArchive.upsert({
      where: {
        userId_expenseCategoryId: {
          userId: input.userId,
          expenseCategoryId: input.categoryId,
        },
      },
      create: { userId: input.userId, expenseCategoryId: input.categoryId },
      update: {},
    });

    return this.toDomain(category, true);
  }

  private mapUniqueViolation(error: unknown): unknown {
    // A concurrent request can pass the pre-check and hit the unique index instead.
    const isUniqueViolation =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002';

    return isUniqueViolation
      ? new ExpenseCategoryAlreadyExistsException()
      : error;
  }

  private toDomain(
    category: {
      id: string;
      userId: string | null;
      name: string;
      createdAt: Date;
      updatedAt: Date;
    },
    isArchivedForUser = false,
  ): ExpenseCategory {
    return ExpenseCategory.create({
      id: category.id,
      userId: category.userId,
      name: category.name,
      isArchived: isArchivedForUser,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }
}
