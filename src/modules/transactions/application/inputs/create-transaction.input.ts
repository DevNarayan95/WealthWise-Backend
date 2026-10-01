import { TransactionType } from '../../domain/entities/transaction.entity';

export interface CreateTransactionInput {
  userId: string;
  accountId: string;
  type: TransactionType;
  amount: string;
  currency: string;
  description: string | null;
  transactionDate: Date;
}
