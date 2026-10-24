import { TransactionType } from '../../domain/entities/transaction.entity';

export interface ExportTransactionsInput {
  userId: string;
  accountId?: string;
  from?: string;
  to?: string;
  type?: TransactionType;
  incomeCategoryId?: string;
  expenseCategoryId?: string;
}
