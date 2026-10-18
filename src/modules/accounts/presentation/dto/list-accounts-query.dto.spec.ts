import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PAGINATION } from '../../../../common/pagination/pagination-config';
import { ListAccountsQueryDto } from './list-accounts-query.dto';

describe('ListAccountsQueryDto', () => {
  it('defaults limit to the configured default page size', () => {
    expect(new ListAccountsQueryDto().limit).toBe(PAGINATION.defaultPageSize);
  });

  it('accepts a limit equal to the configured maximum', async () => {
    const errors = await validate(
      plainToInstance(ListAccountsQueryDto, { limit: PAGINATION.maxPageSize }),
    );

    expect(errors).toHaveLength(0);
  });

  it('rejects a limit above the configured maximum', async () => {
    const errors = await validate(
      plainToInstance(ListAccountsQueryDto, {
        limit: PAGINATION.maxPageSize + 1,
      }),
    );

    expect(errors.map((error) => error.property)).toContain('limit');
  });
});
