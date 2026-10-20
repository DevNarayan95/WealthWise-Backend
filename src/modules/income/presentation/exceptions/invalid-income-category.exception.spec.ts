import { HttpStatus } from '@nestjs/common';

import { InvalidIncomeCategoryException } from './invalid-income-category.exception';

describe('InvalidIncomeCategoryException', () => {
  it('should create a 400 application exception with the given message', () => {
    const exception = new InvalidIncomeCategoryException('Name is required');

    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.getResponse()).toEqual({
      code: 'INVALID_INCOME_CATEGORY',
      message: 'Name is required',
    });
  });
});
