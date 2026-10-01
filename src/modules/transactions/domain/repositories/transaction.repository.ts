import { Transaction, TransactionType } from '../entities/transaction.entity';

export interface CreateTransactionRepositoryInput {
  accountId: string;
  type: TransactionType;
  amount: string;
  currency: string;
  description: string | null;
  transactionDate: Date;
}

export interface FindTransactionsRepositoryInput {
  accountId: string;
  userId: string;
  offset: number;
  limit: number;
}

export interface FindTransactionsRepositoryOutput {
  transactions: Transaction[];
  total: number;
}

export abstract class TransactionRepository {
  abstract create(
    input: CreateTransactionRepositoryInput,
  ): Promise<Transaction>;

  abstract findByIdForUser(
    transactionId: string,
    userId: string,
  ): Promise<Transaction | null>;

  abstract findAllByAccountForUser(
    input: FindTransactionsRepositoryInput,
  ): Promise<FindTransactionsRepositoryOutput>;
}
