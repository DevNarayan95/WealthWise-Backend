import { Injectable } from '@nestjs/common';

import { ExpenseCategory } from '../../domain/entities/expense-category.entity';
import { ExpenseCategoryRepository } from '../../domain/repositories/expense-category.repository';
import {
  EXPENSE_CATEGORY_NAME_MAX_LENGTH,
  isValidExpenseCategoryName,
  normalizeExpenseCategoryName,
} from '../../domain/validations/expense-category-validation';

import { ExpenseCategoryAlreadyExistsException } from '../../presentation/exceptions/expense-category-already-exists.exception';
import { ExpenseCategoryNotFoundException } from '../../presentation/exceptions/expense-category-not-found.exception';
import { InvalidExpenseCategoryException } from '../../presentation/exceptions/invalid-expense-category.exception';
import { SystemExpenseCategoryReadOnlyException } from '../../presentation/exceptions/system-expense-category-read-only.exception';

import {
  assertWithinExportLimit,
  getExportRowLimit,
} from '../../../../common/export/export-limit';
import {
  CreateExpenseCategoryInput,
  UpdateExpenseCategoryInput,
} from '../inputs/expense-category.input';
import { PaginatedExpenseCategoriesOutput } from '../outputs/paginated-expense-categories.output';

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    private readonly expenseCategoryRepository: ExpenseCategoryRepository,
  ) {}

  async create(input: CreateExpenseCategoryInput): Promise<ExpenseCategory> {
    const name = this.normalizeName(input.name);
    const normalizedName = normalizeExpenseCategoryName(name);

    await this.assertNameAvailable({
      normalizedName,
      userId: input.userId,
    });

    return this.expenseCategoryRepository.create({
      userId: input.userId,
      name,
      normalizedName,
    });
  }

  async findAll(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedExpenseCategoriesOutput> {
    const skip = (page - 1) * limit;

    const result = await this.expenseCategoryRepository.findAllAvailableToUser({
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

  async findAllForExport(userId: string): Promise<ExpenseCategory[]> {
    const maxRows = getExportRowLimit();

    const result = await this.expenseCategoryRepository.findAllAvailableToUser({
      userId,
      skip: 0,
      take: maxRows + 1,
    });

    assertWithinExportLimit(result.categories.length, maxRows);

    return result.categories;
  }

  async findById(categoryId: string, userId: string): Promise<ExpenseCategory> {
    const category =
      await this.expenseCategoryRepository.findByIdAvailableToUser(
        categoryId,
        userId,
      );

    if (!category) {
      throw new ExpenseCategoryNotFoundException();
    }

    return category;
  }

  async update(input: UpdateExpenseCategoryInput): Promise<ExpenseCategory> {
    const name = this.normalizeName(input.name);
    const normalizedName = normalizeExpenseCategoryName(name);

    const existing = await this.findById(input.categoryId, input.userId);
    this.assertCustomCategory(existing);

    await this.assertNameAvailable({
      normalizedName,
      userId: input.userId,
      excludeCategoryId: input.categoryId,
    });

    const updated = await this.expenseCategoryRepository.updateCustomCategory({
      categoryId: input.categoryId,
      userId: input.userId,
      name,
      normalizedName,
    });

    if (!updated) {
      throw new ExpenseCategoryNotFoundException();
    }

    return updated;
  }

  async archive(categoryId: string, userId: string): Promise<ExpenseCategory> {
    await this.findById(categoryId, userId);

    const archived = await this.expenseCategoryRepository.archiveForUser({
      categoryId,
      userId,
    });

    if (!archived) {
      throw new ExpenseCategoryNotFoundException();
    }

    return archived;
  }

  private normalizeName(name: string): string {
    const trimmed = name.trim();

    if (!isValidExpenseCategoryName(trimmed)) {
      throw new InvalidExpenseCategoryException(
        `Expense category name must be between 1 and ${EXPENSE_CATEGORY_NAME_MAX_LENGTH} characters`,
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
      await this.expenseCategoryRepository.findAvailableByNormalizedName(input);

    if (duplicate) {
      throw new ExpenseCategoryAlreadyExistsException();
    }
  }

  private assertCustomCategory(category: ExpenseCategory): void {
    if (category.isSystem) {
      throw new SystemExpenseCategoryReadOnlyException();
    }
  }
}
