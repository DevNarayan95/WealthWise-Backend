import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { IncomeCategory } from '../../domain/entities/income-category.entity';
import { IncomeCategoryAlreadyExistsException } from '../../presentation/exceptions/income-category-already-exists.exception';

import {
  ArchiveIncomeCategoryRepositoryInput,
  CreateIncomeCategoryRepositoryInput,
  FindIncomeCategoriesRepositoryInput,
  FindIncomeCategoriesRepositoryOutput,
  FindIncomeCategoryByNormalizedNameRepositoryInput,
  IncomeCategoryRepository,
  UpdateIncomeCategoryRepositoryInput,
} from '../../domain/repositories/income-category.repository';

@Injectable()
export class PrismaIncomeCategoryRepository extends IncomeCategoryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateIncomeCategoryRepositoryInput,
  ): Promise<IncomeCategory> {
    try {
      const category = await this.prisma.incomeCategory.create({
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
    input: FindIncomeCategoryByNormalizedNameRepositoryInput,
  ): Promise<IncomeCategory | null> {
    const category = await this.prisma.incomeCategory.findFirst({
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
  ): Promise<IncomeCategory | null> {
    const category = await this.prisma.incomeCategory.findFirst({
      where: {
        id: categoryId,
        archives: { none: { userId } },
        OR: [{ userId: null }, { userId }],
      },
    });

    return category ? this.toDomain(category) : null;
  }

  async findAllAvailableToUser(
    input: FindIncomeCategoriesRepositoryInput,
  ): Promise<FindIncomeCategoriesRepositoryOutput> {
    const where = {
      archives: { none: { userId: input.userId } },
      OR: [{ userId: null }, { userId: input.userId }],
    };

    const categories = await this.prisma.incomeCategory.findMany({
      where,
      skip: input.skip,
      take: input.take,
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    });

    const total = await this.prisma.incomeCategory.count({
      where,
    });

    return {
      categories: categories.map((category) => this.toDomain(category)),
      total,
    };
  }

  async updateCustomCategory(
    input: UpdateIncomeCategoryRepositoryInput,
  ): Promise<IncomeCategory | null> {
    let result: { count: number };
    try {
      result = await this.prisma.incomeCategory.updateMany({
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

    const category = await this.prisma.incomeCategory.findFirst({
      where: {
        id: input.categoryId,
        userId: input.userId,
        archives: { none: { userId: input.userId } },
      },
    });

    return category ? this.toDomain(category) : null;
  }

  async archiveForUser(
    input: ArchiveIncomeCategoryRepositoryInput,
  ): Promise<IncomeCategory | null> {
    const category = await this.prisma.incomeCategory.findFirst({
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
    await this.prisma.userIncomeCategoryArchive.upsert({
      where: {
        userId_incomeCategoryId: {
          userId: input.userId,
          incomeCategoryId: input.categoryId,
        },
      },
      create: { userId: input.userId, incomeCategoryId: input.categoryId },
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
      ? new IncomeCategoryAlreadyExistsException()
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
  ): IncomeCategory {
    return IncomeCategory.create({
      id: category.id,
      userId: category.userId,
      name: category.name,
      isArchived: isArchivedForUser,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }
}
