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
});
