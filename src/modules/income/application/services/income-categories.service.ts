import { Injectable } from '@nestjs/common';

import { IncomeCategory } from '../../domain/entities/income-category.entity';
import { IncomeCategoryRepository } from '../../domain/repositories/income-category.repository';
import {
  INCOME_CATEGORY_NAME_MAX_LENGTH,
  isValidIncomeCategoryName,
  normalizeIncomeCategoryName,
} from '../../domain/validations/income-category-validation';

import { IncomeCategoryAlreadyExistsException } from '../../presentation/exceptions/income-category-already-exists.exception';
import { IncomeCategoryNotFoundException } from '../../presentation/exceptions/income-category-not-found.exception';
import { InvalidIncomeCategoryException } from '../../presentation/exceptions/invalid-income-category.exception';
import { SystemIncomeCategoryReadOnlyException } from '../../presentation/exceptions/system-income-category-read-only.exception';

import {
  assertWithinExportLimit,
  getExportRowLimit,
} from '../../../../common/export/export-limit';

import {
  CreateIncomeCategoryInput,
  UpdateIncomeCategoryInput,
} from '../inputs/income-category.input';
import { PaginatedIncomeCategoriesOutput } from '../outputs/paginated-income-categories.output';

@Injectable()
export class IncomeCategoriesService {
  constructor(
    private readonly incomeCategoryRepository: IncomeCategoryRepository,
  ) {}

  async create(input: CreateIncomeCategoryInput): Promise<IncomeCategory> {
    const name = this.normalizeName(input.name);
    const normalizedName = normalizeIncomeCategoryName(name);

    await this.assertNameAvailable({
      normalizedName,
      userId: input.userId,
    });

    return this.incomeCategoryRepository.create({
      userId: input.userId,
      name,
      normalizedName,
    });
  }

  async findAll(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedIncomeCategoriesOutput> {
    const skip = (page - 1) * limit;

    const result = await this.incomeCategoryRepository.findAllAvailableToUser({
      userId,
      skip,
      take: limit,
    });

    return {
      items: result.categories,
      page,
      limit,
      total: result.total,
    };
  }

  async findAllForExport(userId: string): Promise<IncomeCategory[]> {
    const maxRows = getExportRowLimit();

    const result = await this.incomeCategoryRepository.findAllAvailableToUser({
      userId,
      skip: 0,
      take: maxRows + 1,
    });

    assertWithinExportLimit(result.categories.length, maxRows);

    return result.categories;
  }

  async findById(categoryId: string, userId: string): Promise<IncomeCategory> {
    const category =
      await this.incomeCategoryRepository.findByIdAvailableToUser(
        categoryId,
        userId,
      );

    if (!category) {
      throw new IncomeCategoryNotFoundException();
    }

    return category;
  }

  async update(input: UpdateIncomeCategoryInput): Promise<IncomeCategory> {
    const name = this.normalizeName(input.name);
    const normalizedName = normalizeIncomeCategoryName(name);

    const existing = await this.findById(input.categoryId, input.userId);
    this.assertCustomCategory(existing);

    await this.assertNameAvailable({
      normalizedName,
      userId: input.userId,
      excludeCategoryId: input.categoryId,
    });

    const updated = await this.incomeCategoryRepository.updateCustomCategory({
      categoryId: input.categoryId,
      userId: input.userId,
      name,
      normalizedName,
    });

    if (!updated) {
      throw new IncomeCategoryNotFoundException();
    }

    return updated;
  }

  async archive(categoryId: string, userId: string): Promise<IncomeCategory> {
    await this.findById(categoryId, userId);

    const archived = await this.incomeCategoryRepository.archiveForUser({
      categoryId,
      userId,
    });

    if (!archived) {
      throw new IncomeCategoryNotFoundException();
    }

    return archived;
  }

  private normalizeName(name: string): string {
    const trimmed = name.trim();

    if (!isValidIncomeCategoryName(trimmed)) {
      throw new InvalidIncomeCategoryException(
        `Income category name must be between 1 and ${INCOME_CATEGORY_NAME_MAX_LENGTH} characters`,
      );
    }

    return trimmed;
  }

  private async assertNameAvailable(input: {
    normalizedName: string;
    userId: string;
    excludeCategoryId?: string;
  }): Promise<void> {
    const duplicate =
      await this.incomeCategoryRepository.findAvailableByNormalizedName(input);

    if (duplicate) {
      throw new IncomeCategoryAlreadyExistsException();
    }
  }

  private assertCustomCategory(category: IncomeCategory): void {
    if (category.isSystem) {
      throw new SystemIncomeCategoryReadOnlyException();
    }
  }
}
