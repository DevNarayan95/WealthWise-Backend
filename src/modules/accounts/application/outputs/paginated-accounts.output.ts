import { Account } from '../../domain/entities/account.entity';

export interface PaginatedAccountsOutput {
  items: Account[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
