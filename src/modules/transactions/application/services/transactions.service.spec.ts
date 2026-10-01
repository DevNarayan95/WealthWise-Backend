import { AccountStatus } from '../../../accounts/domain/entities/account.entity';
import { AccountsService } from '../../../accounts/application/services/accounts.service';

import {
  Transaction,
  TransactionType,
} from '../../domain/entities/transaction.entity';

import { TransactionRepository } from '../../domain/repositories/transaction.repository';

import { InvalidTransactionException } from '../../exceptions/invalid-transaction.exception';

import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  let transactionsRepository: {
    create: jest.Mock;
  };

  let accountsService: {
    findById: jest.Mock;
  };

  const transactionDate = new Date('2026-09-01T00:00:00.000Z');

  const activeAccount = {
    id: 'account-1',
    currency: 'MYR',
    status: AccountStatus.ACTIVE,
  };

  const archivedAccount = {
    ...activeAccount,
    status: AccountStatus.ARCHIVED,
  };

  const createTransactionInput = {
    userId: 'user-1',
    accountId: 'account-1',
    type: TransactionType.EXPENSE,
    amount: '50.00',
    currency: 'MYR',
    description: 'Lunch',
    transactionDate,
  };

  const createdTransaction = Transaction.create({
    id: 'transaction-1',
    accountId: 'account-1',
    type: TransactionType.EXPENSE,
    amount: '50.00',
    currency: 'MYR',
    description: 'Lunch',
    transactionDate,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    transactionsRepository = {
      create: jest.fn(),
    };

    accountsService = {
      findById: jest.fn(),
    };

    service = new TransactionsService(
      transactionsRepository as never as TransactionRepository,
      accountsService as never as AccountsService,
    );
  });

  describe('Create', () => {
    it('should create an income transaction', async () => {
      const input = {
        ...createTransactionInput,
        type: TransactionType.INCOME,
        amount: '2500.00',
        currency: 'myr',
        description: ' Salary ',
      };

      accountsService.findById.mockResolvedValue(activeAccount);
      transactionsRepository.create.mockResolvedValue(createdTransaction);

      const result = await service.create(input);

      expect(accountsService.findById).toHaveBeenCalledWith(
        activeAccount.id,
        input.userId,
      );
      expect(transactionsRepository.create).toHaveBeenCalledWith({
        accountId: activeAccount.id,
        type: TransactionType.INCOME,
        amount: '2500.00',
        currency: 'MYR',
        description: 'Salary',
        transactionDate,
      });

      expect(result).toBe(createdTransaction);
    });

    it('should create an expense transaction', async () => {
      accountsService.findById.mockResolvedValue(activeAccount);
      transactionsRepository.create.mockResolvedValue(createdTransaction);

      const result = await service.create(createTransactionInput);

      expect(result).toBe(createdTransaction);

      expect(transactionsRepository.create).toHaveBeenCalledWith({
        accountId: activeAccount.id,
        type: TransactionType.EXPENSE,
        amount: '50.00',
        currency: 'MYR',
        description: 'Lunch',
        transactionDate,
      });
    });

    it('should reject transactions for archived accounts', async () => {
      accountsService.findById.mockResolvedValue(archivedAccount);

      await expect(service.create(createTransactionInput)).rejects.toThrow(
        InvalidTransactionException,
      );

      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should reject currency mismatch', async () => {
      accountsService.findById.mockResolvedValue(activeAccount);

      await expect(
        service.create({
          ...createTransactionInput,
          currency: 'USD',
        }),
      ).rejects.toThrow(InvalidTransactionException);

      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should reject zero amount', async () => {
      await expect(
        service.create({
          ...createTransactionInput,
          amount: '0',
        }),
      ).rejects.toThrow(InvalidTransactionException);

      expect(accountsService.findById).not.toHaveBeenCalled();
    });

    it('should reject negative amount', async () => {
      await expect(
        service.create({
          ...createTransactionInput,
          amount: '-50.00',
        }),
      ).rejects.toThrow(InvalidTransactionException);

      expect(accountsService.findById).not.toHaveBeenCalled();
    });

    it('should reject excessive decimal precision', async () => {
      await expect(
        service.create({
          ...createTransactionInput,
          amount: '50.12345',
        }),
      ).rejects.toThrow(InvalidTransactionException);

      expect(accountsService.findById).not.toHaveBeenCalled();
    });

    it('should reject invalid currency', async () => {
      await expect(
        service.create({
          ...createTransactionInput,
          currency: 'MY',
        }),
      ).rejects.toThrow(InvalidTransactionException);

      expect(accountsService.findById).not.toHaveBeenCalled();
    });

    it('should reject excessive description length', async () => {
      await expect(
        service.create({
          ...createTransactionInput,
          description: 'a'.repeat(256),
        }),
      ).rejects.toThrow(InvalidTransactionException);

      expect(accountsService.findById).not.toHaveBeenCalled();
    });

    it('should reject invalid transaction date', async () => {
      await expect(
        service.create({
          ...createTransactionInput,
          transactionDate: new Date('invalid'),
        }),
      ).rejects.toThrow(InvalidTransactionException);

      expect(accountsService.findById).not.toHaveBeenCalled();
    });
  });
});
