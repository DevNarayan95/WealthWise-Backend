import { AccountAlreadyArchivedException } from './account-already-archived.exception';

describe('AccountAlreadyArchivedException', () => {
  it('should contain the expected message', () => {
    const exception = new AccountAlreadyArchivedException();

    expect(exception.message).toBe('Account is already archived');
  });

  it('should have the correct exception name', () => {
    const exception = new AccountAlreadyArchivedException();

    expect(exception.name).toBe('AccountAlreadyArchivedException');
  });

  it('should extend Error', () => {
    const exception = new AccountAlreadyArchivedException();

    expect(exception).toBeInstanceOf(Error);
  });
});
