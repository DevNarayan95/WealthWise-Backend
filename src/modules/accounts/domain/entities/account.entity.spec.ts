import { AccountAlreadyArchivedException } from '../exceptions/account-already-archived.exception';
import { Account, AccountStatus, AccountType } from './account.entity';

describe('Account', () => {
  const createAccount = (
    status: AccountStatus = AccountStatus.ACTIVE,
  ): Account => {
    return Account.create({
      id: 'account-id',
      userId: 'user-id',
      name: 'Maybank Savings',
      type: AccountType.BANK_ACCOUNT,
      currency: 'MYR',
      openingBalance: '1000.50',
      status,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });
  };

  describe('create', () => {
    it('should create an account with the provided properties', () => {
      const account = createAccount();

      expect(account.id).toBe('account-id');
      expect(account.userId).toBe('user-id');
      expect(account.name).toBe('Maybank Savings');
      expect(account.type).toBe(AccountType.BANK_ACCOUNT);
      expect(account.currency).toBe('MYR');
      expect(account.openingBalance).toBe('1000.50');
      expect(account.status).toBe(AccountStatus.ACTIVE);
    });
  });

  describe('archive', () => {
    it('should archive an active account', () => {
      const account = createAccount();

      const archivedAccount = account.archive();

      expect(archivedAccount.status).toBe(AccountStatus.ARCHIVED);
    });

    it('should not mutate the original account', () => {
      const account = createAccount();

      const archivedAccount = account.archive();

      expect(account.status).toBe(AccountStatus.ACTIVE);
      expect(archivedAccount.status).toBe(AccountStatus.ARCHIVED);
      expect(archivedAccount).not.toBe(account);
    });

    it('should preserve the account properties when archiving', () => {
      const account = createAccount();

      const archivedAccount = account.archive();

      expect(archivedAccount.id).toBe(account.id);
      expect(archivedAccount.userId).toBe(account.userId);
      expect(archivedAccount.name).toBe(account.name);
      expect(archivedAccount.type).toBe(account.type);
      expect(archivedAccount.currency).toBe(account.currency);
      expect(archivedAccount.openingBalance).toBe(account.openingBalance);
      expect(archivedAccount.createdAt).toBe(account.createdAt);
      expect(archivedAccount.updatedAt).toBe(account.updatedAt);
    });

    it('should reject archiving an already archived account', () => {
      const account = createAccount(AccountStatus.ARCHIVED);

      expect(() => account.archive()).toThrow(AccountAlreadyArchivedException);
    });
  });
});
