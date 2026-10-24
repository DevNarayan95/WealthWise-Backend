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
  transferGroupId?: string | null;
  transferExchangeRate?: string | null;
  transferRateSource?: TransactionRateSource | null;
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

export type FindTransactionsForExportRepositoryInput = Omit<
  FindTransactionsRepositoryInput,
  'offset' | 'limit'
> & {
  take: number;
};

/**
 * Read model for exports: the transaction plus the display names that the
 * domain entity intentionally does not carry.
 */
export interface TransactionExportRecord {
  transaction: Transaction;
  accountName: string;
  categoryName: string | null;
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

  /** Writes both legs of a transfer atomically. */
  abstract createTransferLegs(
    inputs: [
      CreateTransactionRepositoryInput,
      CreateTransactionRepositoryInput,
    ],
  ): Promise<[Transaction, Transaction]>;

  abstract findTransferLegsByGroupForUser(
    transferGroupId: string,
    userId: string,
  ): Promise<Transaction[]>;

  abstract findAllByAccountForUser(
    input: FindTransactionsRepositoryInput,
  ): Promise<FindTransactionsRepositoryOutput>;

  abstract findAllForExportByUser(
    input: FindTransactionsForExportRepositoryInput,
  ): Promise<TransactionExportRecord[]>;
}
