import { ExpenseCategory } from '../entities/expense-category.entity';

export interface CreateExpenseCategoryRepositoryInput {
  userId: string;
  name: string;
  normalizedName: string;
}

export interface FindExpenseCategoryByNormalizedNameRepositoryInput {
  normalizedName: string;
  userId: string;
  excludeCategoryId?: string;
}

export interface FindExpenseCategoriesRepositoryInput {
  userId: string;
  skip: number;
  take: number;
}

export interface FindExpenseCategoriesRepositoryOutput {
  categories: ExpenseCategory[];
  total: number;
}

export interface UpdateExpenseCategoryRepositoryInput {
  categoryId: string;
  userId: string;
  name: string;
  normalizedName: string;
}

export interface ArchiveExpenseCategoryRepositoryInput {
  categoryId: string;
  userId: string;
}

export abstract class ExpenseCategoryRepository {
  abstract create(
    input: CreateExpenseCategoryRepositoryInput,
  ): Promise<ExpenseCategory>;

  abstract findAvailableByNormalizedName(
    input: FindExpenseCategoryByNormalizedNameRepositoryInput,
  ): Promise<ExpenseCategory | null>;

  abstract findByIdAvailableToUser(
    categoryId: string,
    userId: string,
  ): Promise<ExpenseCategory | null>;

  abstract findAllAvailableToUser(
    input: FindExpenseCategoriesRepositoryInput,
  ): Promise<FindExpenseCategoriesRepositoryOutput>;

  abstract updateCustomCategory(
    input: UpdateExpenseCategoryRepositoryInput,
  ): Promise<ExpenseCategory | null>;

  abstract archiveForUser(
    input: ArchiveExpenseCategoryRepositoryInput,
  ): Promise<ExpenseCategory | null>;
}
