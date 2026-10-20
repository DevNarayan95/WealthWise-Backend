import { IncomeCategory } from '../../domain/entities/income-category.entity';

export interface PaginatedIncomeCategoriesOutput {
  items: IncomeCategory[];
  page: number;
  limit: number;
  total: number;
}
