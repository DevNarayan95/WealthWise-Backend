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
      transactionDate: '2026-09-01',
      reversalOfTransactionId: null,
      incomeCategoryId,
      expenseCategoryId: null,
      baseCurrency: 'INR',
      baseAmount: '5000.0000',
      exchangeRate: '2.00000000',
      rateDate: '2026-09-01',
      rateSource: 'PROVIDER',
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
