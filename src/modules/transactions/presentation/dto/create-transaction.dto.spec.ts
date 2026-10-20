import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { TransactionType } from '../../domain/entities/transaction.entity';
import { CreateTransactionDto } from './create-transaction.dto';

const INCOME_CATEGORY_ID = '8a6f0c8d-5f65-4e6e-8c9e-9d1e5e6b8a12';

const validPayload = {
  accountId: 'b7c4a3d2-7e9f-4f3b-8e6a-1d2c3b4a5e6f',
  type: TransactionType.INCOME,
  amount: '2500.00',
  currency: 'MYR',
  description: 'Salary',
  transactionDate: '2026-09-01T00:00:00.000Z',
};

const toDto = (overrides: Record<string, unknown> = {}) =>
  plainToInstance(CreateTransactionDto, { ...validPayload, ...overrides });

describe('CreateTransactionDto', () => {
  it('accepts a payload without an income category', async () => {
    const errors = await validate(toDto());

    expect(errors).toHaveLength(0);
  });

  it('accepts a valid income category id', async () => {
    const errors = await validate(
      toDto({ incomeCategoryId: INCOME_CATEGORY_ID }),
    );

    expect(errors).toHaveLength(0);
  });

  it('accepts a null income category id', async () => {
    const errors = await validate(toDto({ incomeCategoryId: null }));

    expect(errors).toHaveLength(0);
  });

  it('rejects a malformed income category id', async () => {
    const errors = await validate(toDto({ incomeCategoryId: 'not-a-uuid' }));

    expect(errors.map((error) => error.property)).toContain('incomeCategoryId');
  });
});
