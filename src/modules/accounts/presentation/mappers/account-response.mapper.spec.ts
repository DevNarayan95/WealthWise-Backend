import {
  Account,
  AccountStatus,
  AccountType,
} from '../../domain/entities/account.entity';
import { AccountResponseMapper } from './account-response.mapper';

describe('AccountResponseMapper', () => {
  const createdAt = new Date('2026-08-01T00:00:00.000Z');
  const updatedAt = new Date('2026-08-02T00:00:00.000Z');

  const account = Account.create({
    id: 'account-id',
    userId: 'user-id',
    name: 'Maybank Savings',
    type: AccountType.BANK_ACCOUNT,
    currency: 'MYR',
    openingBalance: '1250.5000',
    status: AccountStatus.ACTIVE,
    createdAt,
    updatedAt,
  });

  describe('toDto', () => {
    it('should map a domain entity to the response DTO', () => {
      const result = AccountResponseMapper.toDto(account);

      expect(result).toEqual({
        id: 'account-id',
        name: 'Maybank Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1250.5000',
        status: AccountStatus.ACTIVE,
        createdAt,
        updatedAt,
      });

      expect(result).not.toHaveProperty('userId');
    });
  });

  describe('toDtoList', () => {
    it('should map multiple domain entities', () => {
      const secondAccount = Account.create({
        id: 'account-id-2',
        userId: 'user-id',
        name: 'Cash Wallet',
        type: AccountType.CASH,
        currency: 'MYR',
        openingBalance: '500.0000',
        status: AccountStatus.ACTIVE,
        createdAt,
        updatedAt,
      });

      const result = AccountResponseMapper.toDtoList([account, secondAccount]);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('account-id');
      expect(result[1].id).toBe('account-id-2');
    });

    it('should return an empty array for no accounts', () => {
      expect(AccountResponseMapper.toDtoList([])).toEqual([]);
    });
  });
});
