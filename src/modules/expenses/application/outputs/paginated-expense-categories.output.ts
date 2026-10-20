import { ExpenseCategory } from '../../domain/entities/expense-category.entity';

export interface PaginatedExpenseCategoriesOutput {
  items: ExpenseCategory[];
  page: number;
  limit: number;
  total: number;
}
