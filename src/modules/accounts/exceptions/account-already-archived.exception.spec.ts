import { HttpStatus } from '@nestjs/common';
import { AccountAlreadyArchivedApplicationException } from './account-already-archived.exception';

describe('AccountAlreadyArchivedApplicationException', () => {
  it('should create a conflict application exception', () => {
    const exception = new AccountAlreadyArchivedApplicationException();

    expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
    expect(exception.getResponse()).toEqual({
      code: 'ACCOUNT_ALREADY_ARCHIVED',
      message: 'Account is already archived',
    });
  });
});
