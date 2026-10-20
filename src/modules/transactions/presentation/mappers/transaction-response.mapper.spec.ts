import {
  Transaction,
  TransactionType,
} from '../../domain/entities/transaction.entity';
import { TransactionResponseMapper } from './transaction-response.mapper';

describe('TransactionResponseMapper', () => {
  const createdAt = new Date('2026-09-01T10:00:00.000Z');

  const createTransaction = (incomeCategoryId: string | null) =>
    Transaction.create({
      id: 'transaction-1',
      accountId: 'account-1',
      type: TransactionType.INCOME,
      amount: '2500.00',
      currency: 'MYR',
      description: 'Salary',
      transactionDate: createdAt,
      reversalOfTransactionId: null,
      incomeCategoryId,
      createdAt,
      updatedAt: createdAt,
    });

  it('exposes the linked income category id', () => {
    const dto = TransactionResponseMapper.toDto(
      createTransaction('category-1'),
    );

    expect(dto.incomeCategoryId).toBe('category-1');
  });

  it('exposes a null income category id when none is linked', () => {
    const dto = TransactionResponseMapper.toDto(createTransaction(null));

    expect(dto.incomeCategoryId).toBeNull();
  });
});
