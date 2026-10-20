import { HttpStatus } from '@nestjs/common';

import { IncomeCategoryAlreadyExistsException } from './income-category-already-exists.exception';

describe('IncomeCategoryAlreadyExistsException', () => {
  it('should create a 409 application exception', () => {
    const exception = new IncomeCategoryAlreadyExistsException();

    expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
    expect(exception.getResponse()).toEqual({
      code: 'INCOME_CATEGORY_ALREADY_EXISTS',
      message: 'An income category with this name already exists',
    });
  });
});
