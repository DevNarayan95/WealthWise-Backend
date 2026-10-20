import { AccountType } from '../entities/account.entity';
import { isAccountType } from './account-validation';

describe('account-validation', () => {
  describe('isAccountType', () => {
    it.each([
      AccountType.BANK_ACCOUNT,
      AccountType.CASH,
      AccountType.CREDIT_CARD,
      AccountType.INVESTMENT,
      AccountType.OTHER,
      AccountType.SAVINGS,
      AccountType.CURRENT,
      AccountType.WALLET,
      AccountType.FIXED_DEPOSIT,
      AccountType.RECURRING_DEPOSIT,
    ])('should accept %s as a supported account type', (type) => {
      expect(isAccountType(type)).toBe(true);
    });

    it.each(['', 'savings', 'UNKNOWN', 'FD', 'RD', 'BANK ACCOUNT'])(
      'should reject %p as an account type',
      (value) => {
        expect(isAccountType(value)).toBe(false);
      },
    );
  });
});
