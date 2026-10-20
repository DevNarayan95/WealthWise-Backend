import { HttpStatus } from '@nestjs/common';

import { SystemExpenseCategoryReadOnlyException } from './system-expense-category-read-only.exception';

describe('SystemExpenseCategoryReadOnlyException', () => {
  it('should create a 403 application exception', () => {
    const exception = new SystemExpenseCategoryReadOnlyException();

    expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(exception.getResponse()).toEqual({
      code: 'SYSTEM_EXPENSE_CATEGORY_READ_ONLY',
      message: 'System expense categories cannot be modified',
    });
  });
});
