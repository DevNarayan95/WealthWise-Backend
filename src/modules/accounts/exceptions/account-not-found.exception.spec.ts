import { HttpStatus } from '@nestjs/common';

import { AccountNotFoundException } from './account-not-found.exception';

describe('AccountNotFoundException', () => {
  it('should create a 404 application exception', () => {
    const exception = new AccountNotFoundException();

    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);

    expect(exception.getResponse()).toEqual({
      code: 'ACCOUNT_NOT_FOUND',
      message: 'Account not found',
    });
  });
});
