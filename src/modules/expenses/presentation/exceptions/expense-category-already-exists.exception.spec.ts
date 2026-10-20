import { HttpStatus } from '@nestjs/common';

import { ExpenseCategoryAlreadyExistsException } from './expense-category-already-exists.exception';

describe('ExpenseCategoryAlreadyExistsException', () => {
  it('should create a 409 application exception', () => {
    const exception = new ExpenseCategoryAlreadyExistsException();

    expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
    expect(exception.getResponse()).toEqual({
      code: 'EXPENSE_CATEGORY_ALREADY_EXISTS',
      message: 'An expense category with this name already exists',
    });
  });
});
