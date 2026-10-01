import { Transaction, TransactionType } from '../entities/transaction.entity';
import {
  CreateTransactionRepositoryInput,
  FindTransactionsRepositoryInput,
  FindAccountsRepositoryOutput,
  TransactionRepository,
  FindTransactionsRepositoryOutput,
} from './transaction.repository';

class FakeTransactionRepository extends TransactionRepository {
  async create(_input: CreateTransactionRepositoryInput): Promise<Transaction> {
    return Transaction.create({
      id: 'transaction-1',
      accountId: 'account-1',
      type: TransactionType.INCOME,
      amount: '1000.000',
      currency: 'MYR',
      description: null,
      transactionDate: new Date('2026-09-20T00:00:00.000Z'),
      createdAt: new Date('2026-09-20T00:00:00.000Z'),
      updatedAt: new Date('2026-09-20T00:00:00.000Z'),
    });
  }

  async findByIdForUser(
    _transactionId: string,
    _userId: string,
  ): Promise<Transaction | null> {
    return null;
  }

  async findAllByAccountForUser(
    _input: FindTransactionsRepositoryInput,
  ): Promise<FindTransactionsRepositoryOutput> {
    return {
      transactions: [],
      total: 0,
    };
  }
}

describe('TransactionRepository', () => {
  it('should define the transaction repository contract', async () => {
    const repository: TransactionRepository = new FakeTransactionRepository();

    const transaction = await repository.create({
      accountId: 'account-1',
      type: TransactionType.INCOME,
      amount: '1000.000',
      currency: 'MYR',
      description: null,
      transactionDate: new Date('2026-09-20T00:00:00.000Z'),
    });

    expect(transaction).toBeInstanceOf(Transaction);
  });

  it('should support user-scoped transaction lookup', async () => {
    const repository: TransactionRepository = new FakeTransactionRepository();

    const result = await repository.findByIdForUser('transaction-1', 'user-1');

    expect(result).toBeNull();
  });

  it('should support paginated account-scoped transaction lookup', async () => {
    const repository: TransactionRepository = new FakeTransactionRepository();

    const result = await repository.findAllByAccountForUser({
      accountId: 'account-1',
      userId: 'user-1',
      offset: 0,
      limit: 20,
    });

    expect(result).toEqual({
      transactions: [],
      total: 0,
    });
  });
});
