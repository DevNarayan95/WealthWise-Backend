import { TransactionType } from '../../domain/entities/transaction.entity';

export interface ListTransactionsInput {
  accountId?: string;
  userId: string;
  offset: number;
  limit: number;
  from?: string;
  to?: string;
  type?: TransactionType;
  incomeCategoryId?: string;
  expenseCategoryId?: string;
}
