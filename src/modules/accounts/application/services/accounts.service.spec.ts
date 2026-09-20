import {
  Account,
  AccountStatus,
  AccountType,
} from '../../domain/entities/account.entity';
import { AccountAlreadyArchivedException } from '../../domain/exceptions/account-already-archived.exception';
import { AccountAlreadyArchivedApplicationException } from '../../exceptions/account-already-archived.exception';
import { AccountNotFoundException } from '../../exceptions/account-not-found.exception';
import { InvalidAccountException } from '../../exceptions/invalid-account.exception';
import { AccountsService } from './accounts.service';

describe('AccountsService', () => {
  const accountRepository = {
    create: jest.fn(),
    findByIdForUser: jest.fn(),
    findAllByUserId: jest.fn(),
    update: jest.fn(),
  };

  let service: AccountsService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AccountsService(accountRepository as never);
  });

  describe('create', () => {
    it('should create a valid account', async () => {
      const account = {
        id: 'account-id',
        userId: 'user-id',
        name: 'Maybank Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1000.0000',
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      accountRepository.create.mockResolvedValue(account);

      const result = await service.create({
        userId: 'user-id',
        name: '  Maybank Savings  ',
        type: AccountType.BANK_ACCOUNT,
        currency: ' myr ',
        openingBalance: ' 1000.0000 ',
      });

      expect(accountRepository.create).toHaveBeenCalledWith({
        userId: 'user-id',
        name: 'Maybank Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1000.0000',
      });

      expect(result).toEqual(account);
    });

    it('should allow a negative opening balance', async () => {
      const account = {
        id: 'account-id',
        userId: 'user-id',
        name: 'Credit Card',
        type: AccountType.CREDIT_CARD,
        currency: 'MYR',
        openingBalance: '-2500.5000',
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      accountRepository.create.mockResolvedValue(account);

      const result = await service.create({
        userId: 'user-id',
        name: 'Credit Card',
        type: AccountType.CREDIT_CARD,
        currency: 'MYR',
        openingBalance: '-2500.5000',
      });

      expect(result.openingBalance).toBe('-2500.5000');
    });

    it('should reject an empty account name', async () => {
      await expect(
        service.create({
          userId: 'user-id',
          name: '   ',
          type: AccountType.CASH,
          currency: 'MYR',
          openingBalance: '100',
        }),
      ).rejects.toBeInstanceOf(InvalidAccountException);

      expect(accountRepository.create).not.toHaveBeenCalled();
    });

    it('should reject an account name longer than 150 characters', async () => {
      await expect(
        service.create({
          userId: 'user-id',
          name: 'A'.repeat(151),
          type: AccountType.CASH,
          currency: 'MYR',
          openingBalance: '100',
        }),
      ).rejects.toBeInstanceOf(InvalidAccountException);

      expect(accountRepository.create).not.toHaveBeenCalled();
    });

    it('should reject an invalid account type', async () => {
      await expect(
        service.create({
          userId: 'user-id',
          name: 'Savings',
          type: 'INVALID_TYPE' as AccountType,
          currency: 'MYR',
          openingBalance: '100',
        }),
      ).rejects.toBeInstanceOf(InvalidAccountException);

      expect(accountRepository.create).not.toHaveBeenCalled();
    });

    it('should normalize lowercase currency to uppercase', async () => {
      accountRepository.create.mockResolvedValue({
        id: 'account-id',
        userId: 'user-id',
        name: 'Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '100',
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create({
        userId: 'user-id',
        name: 'Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'myr',
        openingBalance: '100',
      });

      expect(accountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'MYR',
        }),
      );
    });

    it('should reject an invalid currency code', async () => {
      await expect(
        service.create({
          userId: 'user-id',
          name: 'Savings',
          type: AccountType.BANK_ACCOUNT,
          currency: 'US',
          openingBalance: '100',
        }),
      ).rejects.toBeInstanceOf(InvalidAccountException);

      expect(accountRepository.create).not.toHaveBeenCalled();
    });

    it('should reject currency symbols', async () => {
      await expect(
        service.create({
          userId: 'user-id',
          name: 'Savings',
          type: AccountType.BANK_ACCOUNT,
          currency: '$',
          openingBalance: '100',
        }),
      ).rejects.toBeInstanceOf(InvalidAccountException);

      expect(accountRepository.create).not.toHaveBeenCalled();
    });

    it('should accept an opening balance with up to four decimal places', async () => {
      accountRepository.create.mockResolvedValue({
        id: 'account-id',
        userId: 'user-id',
        name: 'Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1234.5678',
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create({
        userId: 'user-id',
        name: 'Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1234.5678',
      });

      expect(accountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          openingBalance: '1234.5678',
        }),
      );
    });

    it('should reject an opening balance with more than four decimal places', async () => {
      await expect(
        service.create({
          userId: 'user-id',
          name: 'Savings',
          type: AccountType.BANK_ACCOUNT,
          currency: 'MYR',
          openingBalance: '1234.56789',
        }),
      ).rejects.toBeInstanceOf(InvalidAccountException);

      expect(accountRepository.create).not.toHaveBeenCalled();
    });

    it('should reject scientific notation in the opening balance', async () => {
      await expect(
        service.create({
          userId: 'user-id',
          name: 'Savings',
          type: AccountType.BANK_ACCOUNT,
          currency: 'MYR',
          openingBalance: '1e5',
        }),
      ).rejects.toBeInstanceOf(InvalidAccountException);

      expect(accountRepository.create).not.toHaveBeenCalled();
    });

    it('should accept the maximum database-supported opening balance precision', async () => {
      const account = {
        id: 'account-id',
        userId: 'user-id',
        name: 'Large Account',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '123456789012345.1234',
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      accountRepository.create.mockResolvedValue(account);

      const result = await service.create({
        userId: 'user-id',
        name: 'Large Account',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '123456789012345.1234',
      });

      expect(result).toEqual(account);

      expect(accountRepository.create).toHaveBeenCalledWith({
        userId: 'user-id',
        name: 'Large Account',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '123456789012345.1234',
      });
    });

    it('should reject an opening balance exceeding database precision', async () => {
      await expect(
        service.create({
          userId: 'user-id',
          name: 'Large Account',
          type: AccountType.BANK_ACCOUNT,
          currency: 'MYR',
          openingBalance: '1234567890123456.1234',
        }),
      ).rejects.toBeInstanceOf(InvalidAccountException);

      expect(accountRepository.create).not.toHaveBeenCalled();
    });

    it('should allow a maximum precision negative opening balance', async () => {
      const account = {
        id: 'account-id',
        userId: 'user-id',
        name: 'Credit Account',
        type: AccountType.CREDIT_CARD,
        currency: 'MYR',
        openingBalance: '-123456789012345.1234',
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      accountRepository.create.mockResolvedValue(account);

      const result = await service.create({
        userId: 'user-id',
        name: 'Credit Account',
        type: AccountType.CREDIT_CARD,
        currency: 'MYR',
        openingBalance: '-123456789012345.1234',
      });

      expect(result.openingBalance).toBe('-123456789012345.1234');
    });
  });

  describe('findById', () => {
    it('should return the account belonging to the user', async () => {
      const account = {
        id: 'account-id',
        userId: 'user-id',
        name: 'Cash Wallet',
        type: AccountType.CASH,
        currency: 'MYR',
        openingBalance: '500.0000',
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      };

      accountRepository.findByIdForUser.mockResolvedValue(account);

      const result = await service.findById('account-id', 'user-id');

      expect(accountRepository.findByIdForUser).toHaveBeenCalledWith(
        'account-id',
        'user-id',
      );

      expect(result).toEqual(account);
    });

    it('should throw AccountNotFoundException when the account does not exist', async () => {
      accountRepository.findByIdForUser.mockResolvedValue(null);

      await expect(
        service.findById('account-id', 'user-id'),
      ).rejects.toBeInstanceOf(AccountNotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all accounts belonging to the user', async () => {
      const accounts = [
        {
          id: 'account-1',
          userId: 'user-id',
          name: 'Maybank Savings',
          type: AccountType.BANK_ACCOUNT,
          currency: 'MYR',
          openingBalance: '1000.0000',
          status: AccountStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      accountRepository.findAllByUserId.mockResolvedValue({
        accounts,
        total: 1,
      });

      const result = await service.findAll('user-id', 1, 10);

      expect(accountRepository.findAllByUserId).toHaveBeenCalledWith({
        userId: 'user-id',
        skip: 0,
        take: 10,
      });

      expect(result.items).toEqual(accounts);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('archive', () => {
    it('should archive an active account owned by the user', async () => {
      const account = Account.create({
        id: 'account-id',
        userId: 'user-id',
        name: 'Maybank Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1000.0000',
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      });
      const archivedAccount = Account.create({
        id: 'account-id',
        userId: 'user-id',
        name: 'Maybank Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1000.0000',
        status: AccountStatus.ARCHIVED,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-02T00:00:00.000Z'),
      });
      accountRepository.findByIdForUser.mockResolvedValue(account);
      accountRepository.update.mockResolvedValue(archivedAccount);
      const result = await service.archive('account-id', 'user-id');
      expect(accountRepository.findByIdForUser).toHaveBeenCalledWith(
        'account-id',
        'user-id',
      );
      expect(accountRepository.update).toHaveBeenCalledWith({
        accountId: 'account-id',
        userId: 'user-id',
        status: AccountStatus.ARCHIVED,
      });
      expect(result.status).toBe(AccountStatus.ARCHIVED);
      expect(result.id).toBe('account-id');
    });

    it('should throw AccountNotFoundException when the account does not exist or is not owned by the user', async () => {
      accountRepository.findByIdForUser.mockResolvedValue(null);
      await expect(
        service.archive('account-id', 'user-id'),
      ).rejects.toBeInstanceOf(AccountNotFoundException);
      expect(accountRepository.findByIdForUser).toHaveBeenCalledWith(
        'account-id',
        'user-id',
      );
      expect(accountRepository.update).not.toHaveBeenCalled();
    });

    it('should reject archiving an already archived account', async () => {
      const account = Account.create({
        id: 'account-id',
        userId: 'user-id',
        name: 'Maybank Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1000.0000',
        status: AccountStatus.ARCHIVED,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      });

      accountRepository.findByIdForUser.mockResolvedValue(account);

      await expect(
        service.archive('account-id', 'user-id'),
      ).rejects.toBeInstanceOf(AccountAlreadyArchivedApplicationException);

      expect(accountRepository.findByIdForUser).toHaveBeenCalledWith(
        'account-id',
        'user-id',
      );

      expect(accountRepository.update).not.toHaveBeenCalled();
    });

    it('should throw AccountNotFoundException when the repository update does not update an account', async () => {
      const account = Account.create({
        id: 'account-id',
        userId: 'user-id',
        name: 'Maybank Savings',
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1000.0000',
        status: AccountStatus.ACTIVE,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      });
      accountRepository.findByIdForUser.mockResolvedValue(account);
      accountRepository.update.mockResolvedValue(null);
      await expect(
        service.archive('account-id', 'user-id'),
      ).rejects.toBeInstanceOf(AccountNotFoundException);
      expect(accountRepository.update).toHaveBeenCalledWith({
        accountId: 'account-id',
        userId: 'user-id',
        status: AccountStatus.ARCHIVED,
      });
    });
  });
});
