import { HttpStatus } from '@nestjs/common';

import { SystemIncomeCategoryReadOnlyException } from './system-income-category-read-only.exception';

describe('SystemIncomeCategoryReadOnlyException', () => {
  it('should create a 403 application exception', () => {
    const exception = new SystemIncomeCategoryReadOnlyException();

    expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(exception.getResponse()).toEqual({
      code: 'SYSTEM_INCOME_CATEGORY_READ_ONLY',
      message: 'System income categories cannot be modified',
    });
  });
});
