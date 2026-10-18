import { IncomeCategory } from '../entities/income-category.entity';

export interface CreateIncomeCategoryRepositoryInput {
  userId: string;
  name: string;
}

export interface FindIncomeCategoriesRepositoryInput {
  userId: string;
  skip: number;
  take: number;
}

export interface FindIncomeCategoriesRepositoryOutput {
  categories: IncomeCategory[];
  total: number;
}

export interface UpdateIncomeCategoryRepositoryInput {
  categoryId: string;
  userId: string;
  name: string;
}

export interface ArchiveIncomeCategoryRepositoryInput {
  categoryId: string;
  userId: string;
}

export abstract class IncomeCategoryRepository {
  abstract create(
    input: CreateIncomeCategoryRepositoryInput,
  ): Promise<IncomeCategory>;

  abstract findByIdAvailableToUser(
    categoryId: string,
    userId: string,
  ): Promise<IncomeCategory | null>;

  abstract findAllAvailableToUser(
    input: FindIncomeCategoriesRepositoryInput,
  ): Promise<FindIncomeCategoriesRepositoryOutput>;

  abstract updateCustomCategory(
    input: UpdateIncomeCategoryRepositoryInput,
  ): Promise<IncomeCategory | null>;

  abstract archiveCustomCategory(
    input: ArchiveIncomeCategoryRepositoryInput,
  ): Promise<IncomeCategory | null>;
}
