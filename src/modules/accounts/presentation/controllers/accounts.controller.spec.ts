import {
  AccountStatus,
  AccountType,
} from '../../domain/entities/account.entity';
import { AccountsController } from './accounts.controller';
import { AuthenticatedRequest } from 'src/modules/auth/infrastructure/interfaces/authenticated-request.interface';
import { request as expressRequest } from 'express';

const createAuthenticatedRequest = (): AuthenticatedRequest =>
  Object.assign(expressRequest, {
    user: {
      userId: 'user-id',
      email: 'user@example.com',
    },
  });

describe('AccountsController', () => {
  const accountsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    archive: jest.fn(),
    getBalance: jest.fn(),
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
          id: 'account-1',
          userId: 'user-id',
          name: 'Maybank Savings',
          type: AccountType.BANK_ACCOUNT,
          currency: 'MYR',
          openingBalance: '1000.0000',
          status: AccountStatus.ACTIVE,
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
          updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        },
      ];

      accountsService.findAll.mockResolvedValue({
        items: accounts,
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });

      const request = createAuthenticatedRequest();

      const result = await controller.findAll(request, {
        page: 1,
        limit: 10,
      });

      expect(accountsService.findAll).toHaveBeenCalledWith('user-id', 1, 10);

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].id).toBe('account-1');

      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
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

  describe('archive', () => {
    it('should archive the authenticated user account', async () => {
      const account = {
        id: 'account-id',
        userId: 'user-id',
        name: 'Maybank Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1000.0000',
        status: AccountStatus.ARCHIVED,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-02T00:00:00.000Z'),
      };

      accountsService.archive.mockResolvedValue(account);

      const request = createAuthenticatedRequest();

      const result = await controller.archive('account-id', request);

      expect(accountsService.archive).toHaveBeenCalledWith(
        'account-id',
        'user-id',
      );

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('account-id');
      expect(result.data.status).toBe(AccountStatus.ARCHIVED);
    });
  });

  describe('getBalance', () => {
    it('should return the account balance for the authenticated user', async () => {
      accountsService.getBalance.mockResolvedValue({
        accountId: 'account-id',
        currency: 'MYR',
        balance: '1300.0000',
      });

      const request = createAuthenticatedRequest();

      const result = await controller.getBalance(request, 'account-id');

      expect(accountsService.getBalance).toHaveBeenCalledWith(
        'account-id',
        'user-id',
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        accountId: 'account-id',
        currency: 'MYR',
        balance: '1300.0000',
      });
    });
  });
});
