import { HttpStatus } from '@nestjs/common';

import { IncomeCategoryNotFoundException } from './income-category-not-found.exception';

describe('IncomeCategoryNotFoundException', () => {
  it('should create a 404 application exception', () => {
    const exception = new IncomeCategoryNotFoundException();

    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exception.getResponse()).toEqual({
      code: 'INCOME_CATEGORY_NOT_FOUND',
      message: 'Income category not found',
    });
  });
});
