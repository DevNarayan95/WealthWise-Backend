import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { IncomeCategory } from '../../domain/entities/income-category.entity';

import {
  ArchiveIncomeCategoryRepositoryInput,
  CreateIncomeCategoryRepositoryInput,
  FindIncomeCategoriesRepositoryInput,
  FindIncomeCategoriesRepositoryOutput,
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
    const category = await this.prisma.incomeCategory.create({
      data: {
        userId: input.userId,
        name: input.name,
      },
    });

    return this.toDomain(category);
  }

  async findByIdAvailableToUser(
    categoryId: string,
    userId: string,
  ): Promise<IncomeCategory | null> {
    const category = await this.prisma.incomeCategory.findFirst({
      where: {
        id: categoryId,
        isArchived: false,
        OR: [{ userId: null }, { userId }],
      },
    });

    return category ? this.toDomain(category) : null;
  }

  async findAllAvailableToUser(
    input: FindIncomeCategoriesRepositoryInput,
  ): Promise<FindIncomeCategoriesRepositoryOutput> {
    const where = {
      isArchived: false,
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
    const result = await this.prisma.incomeCategory.updateMany({
      where: {
        id: input.categoryId,
        userId: input.userId,
        isArchived: false,
      },
      data: {
        name: input.name,
      },
    });

    if (result.count === 0) {
      return null;
    }

    const category = await this.prisma.incomeCategory.findFirst({
      where: {
        id: input.categoryId,
        userId: input.userId,
        isArchived: false,
      },
    });

    return category ? this.toDomain(category) : null;
  }

  async archiveCustomCategory(
    input: ArchiveIncomeCategoryRepositoryInput,
  ): Promise<IncomeCategory | null> {
    const result = await this.prisma.incomeCategory.updateMany({
      where: {
        id: input.categoryId,
        userId: input.userId,
        isArchived: false,
      },
      data: {
        isArchived: true,
      },
    });

    if (result.count === 0) {
      return null;
    }

    const category = await this.prisma.incomeCategory.findFirst({
      where: {
        id: input.categoryId,
        userId: input.userId,
      },
    });

    return category ? this.toDomain(category) : null;
  }

  private toDomain(category: {
    id: string;
    userId: string | null;
    name: string;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): IncomeCategory {
    return IncomeCategory.create({
      id: category.id,
      userId: category.userId,
      name: category.name,
      isArchived: category.isArchived,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }
}
