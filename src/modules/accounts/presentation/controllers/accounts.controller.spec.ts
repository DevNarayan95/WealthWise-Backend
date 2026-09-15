import {
  AccountStatus,
  AccountType,
} from '../../domain/entities/account.entity';
import { AccountsService } from '../../application/services/accounts.service';
import { AccountsController } from './accounts.controller';

describe('AccountsController', () => {
  const accountsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
  };

  let controller: AccountsController;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new AccountsController(accountsService as never);
  });

  describe('create', () => {
    it('should create an account using the authenticated user id', async () => {
      const account = {
        id: 'account-id',
        userId: 'authenticated-user-id',
        name: 'Maybank Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1000.0000',
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      accountsService.create.mockResolvedValue(account);

      const result = await controller.create(
        {
          user: {
            userId: 'authenticated-user-id',
            email: 'user@example.com',
          },
        } as never,
        {
          name: 'Maybank Savings',
          type: AccountType.BANK_ACCOUNT,
          currency: 'MYR',
          openingBalance: '1000.0000',
        },
      );

      expect(accountsService.create).toHaveBeenCalledWith({
        userId: 'authenticated-user-id',
        name: 'Maybank Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1000.0000',
      });

      expect(result.data).toEqual({
        id: 'account-id',
        name: 'Maybank Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1000.0000',
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      });
    });
  });

  describe('findAll', () => {
    it('should return only accounts belonging to the authenticated user', async () => {
      const accounts = [
        {
          id: 'account-id',
          userId: 'authenticated-user-id',
          name: 'Maybank Savings',
          type: AccountType.BANK_ACCOUNT,
          currency: 'MYR',
          openingBalance: '1000.0000',
          status: AccountStatus.ACTIVE,
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
          updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        },
      ];

      accountsService.findAll.mockResolvedValue(accounts);

      const result = await controller.findAll({
        user: {
          userId: 'authenticated-user-id',
          email: 'user@example.com',
        },
      } as never);

      expect(accountsService.findAll).toHaveBeenCalledWith(
        'authenticated-user-id',
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('account-id');
    });
  });

  describe('findById', () => {
    it('should find the account using the authenticated user id', async () => {
      const account = {
        id: 'account-id',
        userId: 'authenticated-user-id',
        name: 'Cash Wallet',
        type: AccountType.CASH,
        currency: 'MYR',
        openingBalance: '500.0000',
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      accountsService.findById.mockResolvedValue(account);

      const result = await controller.findById(
        {
          user: {
            userId: 'authenticated-user-id',
            email: 'user@example.com',
          },
        } as never,
        'account-id',
      );

      expect(accountsService.findById).toHaveBeenCalledWith(
        'account-id',
        'authenticated-user-id',
      );

      expect(result.data.id).toBe('account-id');
      expect(result.data.name).toBe('Cash Wallet');
    });
  });
});
