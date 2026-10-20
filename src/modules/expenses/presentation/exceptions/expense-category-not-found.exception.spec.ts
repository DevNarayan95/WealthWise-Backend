import { HttpStatus } from '@nestjs/common';

import { ExpenseCategoryNotFoundException } from './expense-category-not-found.exception';

describe('ExpenseCategoryNotFoundException', () => {
  it('should create a 404 application exception', () => {
    const exception = new ExpenseCategoryNotFoundException();

    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exception.getResponse()).toEqual({
      code: 'EXPENSE_CATEGORY_NOT_FOUND',
      message: 'Expense category not found',
    });
  });
});
