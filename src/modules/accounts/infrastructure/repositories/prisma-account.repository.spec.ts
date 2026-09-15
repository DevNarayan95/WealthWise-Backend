import {
  AccountStatus,
  AccountType,
} from '../../domain/entities/account.entity';
import { PrismaAccountRepository } from './prisma-account.repository';

describe('PrismaAccountRepository', () => {
  const prisma = {
    account: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let repository: PrismaAccountRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    repository = new PrismaAccountRepository(prisma as never);
  });

  describe('create', () => {
    it('should create an account and map it to the domain entity', async () => {
      const prismaAccount = {
        id: 'account-id',
        userId: 'user-id',
        name: 'Maybank Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: {
          toString: () => '1250.5000',
        },
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      prisma.account.create.mockResolvedValue(prismaAccount);

      const result = await repository.create({
        userId: 'user-id',
        name: 'Maybank Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1250.5000',
      });

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-id',
          name: 'Maybank Savings',
          type: AccountType.BANK_ACCOUNT,
          currency: 'MYR',
          openingBalance: '1250.5000',
        },
      });

      expect(result.id).toBe('account-id');
      expect(result.userId).toBe('user-id');
      expect(result.name).toBe('Maybank Savings');
      expect(result.type).toBe(AccountType.BANK_ACCOUNT);
      expect(result.currency).toBe('MYR');
      expect(result.openingBalance).toBe('1250.5000');
      expect(result.status).toBe(AccountStatus.ACTIVE);

      expect(result.createdAt).toEqual(new Date('2026-08-01T00:00:00.000Z'));

      expect(result.updatedAt).toEqual(new Date('2026-08-01T00:00:00.000Z'));
    });
  });

  describe('findByIdForUser', () => {
    it('should find an account using both account id and user id', async () => {
      const prismaAccount = {
        id: 'account-id',
        userId: 'user-id',
        name: 'Cash Wallet',
        type: AccountType.CASH,
        currency: 'MYR',
        openingBalance: {
          toString: () => '500.0000',
        },
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      prisma.account.findFirst.mockResolvedValue(prismaAccount);

      const result = await repository.findByIdForUser('account-id', 'user-id');

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'account-id',
          userId: 'user-id',
        },
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe('account-id');
      expect(result?.userId).toBe('user-id');
      expect(result?.openingBalance).toBe('500.0000');
    });

    it('should return null when the account does not exist for the user', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      const result = await repository.findByIdForUser('account-id', 'user-id');

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'account-id',
          userId: 'user-id',
        },
      });

      expect(result).toBeNull();
    });

    it('should not return an account belonging to another user', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      const result = await repository.findByIdForUser(
        'account-id',
        'different-user-id',
      );

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'account-id',
          userId: 'different-user-id',
        },
      });

      expect(result).toBeNull();
    });
  });

  describe('findAllByUserId', () => {
    it('should return all accounts belonging to the user', async () => {
      const prismaAccounts = [
        {
          id: 'account-1',
          userId: 'user-id',
          name: 'Maybank Savings',
          type: AccountType.BANK_ACCOUNT,
          currency: 'MYR',
          openingBalance: {
            toString: () => '1000.0000',
          },
          status: AccountStatus.ACTIVE,
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
          updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        },
        {
          id: 'account-2',
          userId: 'user-id',
          name: 'Cash Wallet',
          type: AccountType.CASH,
          currency: 'MYR',
          openingBalance: {
            toString: () => '250.5000',
          },
          status: AccountStatus.ACTIVE,
          createdAt: new Date('2026-08-02T00:00:00.000Z'),
          updatedAt: new Date('2026-08-02T00:00:00.000Z'),
        },
      ];

      prisma.account.findMany.mockResolvedValue(prismaAccounts);

      const result = await repository.findAllByUserId('user-id');

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-id',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toHaveLength(2);

      expect(result[0].id).toBe('account-1');
      expect(result[0].openingBalance).toBe('1000.0000');

      expect(result[1].id).toBe('account-2');
      expect(result[1].openingBalance).toBe('250.5000');
    });

    it('should return an empty array when the user has no accounts', async () => {
      prisma.account.findMany.mockResolvedValue([]);

      const result = await repository.findAllByUserId('user-id');

      expect(result).toEqual([]);

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-id',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('decimal mapping', () => {
    it('should preserve the exact decimal representation as a string', async () => {
      const prismaAccount = {
        id: 'account-id',
        userId: 'user-id',
        name: 'Investment Account',
        type: AccountType.INVESTMENT,
        currency: 'MYR',
        openingBalance: {
          toString: () => '123456789.1234',
        },
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      prisma.account.findFirst.mockResolvedValue(prismaAccount);

      const result = await repository.findByIdForUser('account-id', 'user-id');

      expect(result?.openingBalance).toBe('123456789.1234');
      expect(typeof result?.openingBalance).toBe('string');
    });
  });

  describe('currency mapping', () => {
    it('should trim whitespace from the persisted currency value', async () => {
      const prismaAccount = {
        id: 'account-id',
        userId: 'user-id',
        name: 'USD Account',
        type: AccountType.BANK_ACCOUNT,
        currency: 'USD ',
        openingBalance: {
          toString: () => '100.0000',
        },
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      prisma.account.findFirst.mockResolvedValue(prismaAccount);

      const result = await repository.findByIdForUser('account-id', 'user-id');

      expect(result?.currency).toBe('USD');
    });
  });
});
