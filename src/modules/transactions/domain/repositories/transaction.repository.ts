import {
  Transaction,
  TransactionRateSource,
  TransactionType,
} from '../entities/transaction.entity';

export interface CreateTransactionRepositoryInput {
  accountId: string;
  type: TransactionType;
  amount: string;
  currency: string;
  description: string | null;
  transactionDate: string;
  reversalOfTransactionId: string | null;
  incomeCategoryId: string | null;
  expenseCategoryId: string | null;
  baseCurrency: string;
  baseAmount: string;
  exchangeRate: string;
  rateDate: string;
  rateSource: TransactionRateSource;
}

export interface FindTransactionsRepositoryInput {
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

  abstract findReversalForTransaction(
    transactionId: string,
    userId: string,
  ): Promise<Transaction | null>;

  abstract findAllByAccountForUser(
    input: FindTransactionsRepositoryInput,
  ): Promise<FindTransactionsRepositoryOutput>;
}
