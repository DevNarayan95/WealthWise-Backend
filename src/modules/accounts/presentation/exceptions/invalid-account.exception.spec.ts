import { HttpStatus } from '@nestjs/common';

import { InvalidAccountException } from './invalid-account.exception';

describe('InvalidAccountException', () => {
  it('should create a 400 application exception with the supplied message', () => {
    const exception = new InvalidAccountException('Invalid account type');

    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);

    expect(exception.getResponse()).toEqual({
      code: 'INVALID_ACCOUNT',
      message: 'Invalid account type',
    });
  });
});
