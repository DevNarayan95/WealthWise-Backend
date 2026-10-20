import { HttpStatus } from '@nestjs/common';

import { InvalidExpenseCategoryException } from './invalid-expense-category.exception';

describe('InvalidExpenseCategoryException', () => {
  it('should create a 400 application exception with the given message', () => {
    const exception = new InvalidExpenseCategoryException('Bad name');

    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.getResponse()).toEqual({
      code: 'INVALID_EXPENSE_CATEGORY',
      message: 'Bad name',
    });
  });
});
