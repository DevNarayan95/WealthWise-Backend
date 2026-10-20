import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PAGINATION } from '../../../../common/pagination/pagination-config';
import { ListTransactionsQueryDto } from './list-transactions-query.dto';

const ACCOUNT_ID = 'b7c4a3d2-7e9f-4f3b-8e6a-1d2c3b4a5e6f';

describe('ListTransactionsQueryDto', () => {
  it('defaults limit to the configured default page size', () => {
    expect(new ListTransactionsQueryDto().limit).toBe(
      PAGINATION.defaultPageSize,
    );
  });

  it('accepts a limit equal to the configured maximum', async () => {
    const errors = await validate(
      plainToInstance(ListTransactionsQueryDto, {
        accountId: ACCOUNT_ID,
        limit: PAGINATION.maxPageSize,
      }),
    );

    expect(errors).toHaveLength(0);
  });

  it('rejects a limit above the configured maximum', async () => {
    const errors = await validate(
      plainToInstance(ListTransactionsQueryDto, {
        accountId: ACCOUNT_ID,
        limit: PAGINATION.maxPageSize + 1,
      }),
    );

    expect(errors.map((error) => error.property)).toContain('limit');
  });

  it('accepts a query without accountId to list across all accounts', async () => {
    const errors = await validate(
      plainToInstance(ListTransactionsQueryDto, {}),
    );

    expect(errors).toHaveLength(0);
  });

  it('rejects an accountId that is not a UUID', async () => {
    const errors = await validate(
      plainToInstance(ListTransactionsQueryDto, { accountId: 'not-a-uuid' }),
    );

    expect(errors.map((error) => error.property)).toContain('accountId');
  });

  it('accepts from and to as YYYY-MM-DD dates', async () => {
    const errors = await validate(
      plainToInstance(ListTransactionsQueryDto, {
        from: '2026-01-01',
        to: '2026-12-31',
      }),
    );

    expect(errors).toHaveLength(0);
  });

  it.each([
    ['from', '2026-1-01'],
    ['from', '01-01-2026'],
    ['to', '2026-01-01T00:00:00Z'],
  ])(
    'rejects %s when it is not a YYYY-MM-DD date (%s)',
    async (field, value) => {
      const errors = await validate(
        plainToInstance(ListTransactionsQueryDto, { [field]: value }),
      );

      expect(errors.map((error) => error.property)).toContain(field);
    },
  );

  it('accepts type INCOME or EXPENSE', async () => {
    const errors = await validate(
      plainToInstance(ListTransactionsQueryDto, { type: 'EXPENSE' }),
    );

    expect(errors).toHaveLength(0);
  });

  it('rejects an unknown transaction type', async () => {
    const errors = await validate(
      plainToInstance(ListTransactionsQueryDto, { type: 'TRANSFER' }),
    );

    expect(errors.map((error) => error.property)).toContain('type');
  });

  it('rejects category filters that are not UUIDs', async () => {
    const errors = await validate(
      plainToInstance(ListTransactionsQueryDto, {
        incomeCategoryId: 'salary',
        expenseCategoryId: 'groceries',
      }),
    );

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['incomeCategoryId', 'expenseCategoryId']),
    );
  });
});
