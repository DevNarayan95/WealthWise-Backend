import { Transaction, TransactionType } from './transaction.entity';

describe('Transaction', () => {
  const transactionDate = new Date('2026-09-20T00:00:00.000Z');
  const createdAt = new Date('2026-09-20T10:00:00.000Z');
  const updatedAt = new Date('2026-09-20T10:00:00.000Z');

  const props = {
    id: 'transaction-1',
    accountId: 'account-1',
    type: TransactionType.INCOME,
    amount: '5000.000',
    currency: 'MYR',
    description: 'September salary',
    transactionDate,
    createdAt,
    updatedAt,
  };

  it('should create a transaction', () => {
    const transaction = Transaction.create(props);
    expect(transaction).toBeInstanceOf(Transaction);
  });

  it('should expose transaction properties through getters', () => {
    const transaction = Transaction.create(props);

    expect(transaction.id).toBe('transaction-1');
    expect(transaction.accountId).toBe('account-1');
    expect(transaction.type).toBe(TransactionType.INCOME);
    expect(transaction.amount).toBe('5000.000');
    expect(transaction.currency).toBe('MYR');
    expect(transaction.description).toBe('September salary');
    expect(transaction.transactionDate).toBe(transactionDate);
    expect(transaction.createdAt).toBe(createdAt);
    expect(transaction.updatedAt).toBe(updatedAt);
  });

  it('should support expense transactions', () => {
    const transaction = Transaction.create({
      ...props,
      type: TransactionType.EXPENSE,
      amount: '120.5000',
      description: 'Groceries',
    });

    expect(transaction.type).toBe(TransactionType.EXPENSE);
    expect(transaction.amount).toBe('120.5000');
  });

  it('should support transactions without a description', () => {
    const transaction = Transaction.create({
      ...props,
      description: null,
    });

    expect(transaction.description).toBeNull();
  });
});
