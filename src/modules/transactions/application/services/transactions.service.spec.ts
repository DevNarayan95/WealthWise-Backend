import { AccountStatus } from '../../../accounts/domain/entities/account.entity';
import { AccountsService } from '../../../accounts/application/services/accounts.service';
import { IncomeCategoriesService } from '../../../income/application/services/income-categories.service';
import { IncomeCategoryNotFoundException } from '../../../income/presentation/exceptions/income-category-not-found.exception';
import { ExchangeRateService } from '../../../fx/application/services/exchange-rate.service';
import { ExpenseCategoriesService } from '../../../expenses/application/services/expense-categories.service';
import { ExpenseCategoryNotFoundException } from '../../../expenses/presentation/exceptions/expense-category-not-found.exception';

import {
  Transaction,
  TransactionType,
} from '../../domain/entities/transaction.entity';

import { InvalidTransactionException } from '../../presentation/exceptions/invalid-transaction.exception';

import { TransactionsService } from './transactions.service';
import { TransactionNotFoundException } from '../../presentation/exceptions/transaction-not-found.exception';
import { ListTransactionsInput } from '../inputs/list-transactions.input';

describe('TransactionsService', () => {
  let service: TransactionsService;

  let transactionsRepository: {
    create: jest.Mock;
    findByIdForUser: jest.Mock;
    findReversalForTransaction: jest.Mock;
    findAllByAccountForUser: jest.Mock;
  };

  let expenseCategoriesService: {
    findById: jest.Mock;
  };

  let accountsService: {
    findById: jest.Mock;
  };

  let incomeCategoriesService: {
    findById: jest.Mock;
  };

  let exchangeRateService: {
    convertToBaseCurrency: jest.Mock;
  };

  const transactionDate = '2026-09-01';

  const baseConversion = {
    baseCurrency: 'INR',
    baseAmount: '1000.0000',
    exchangeRate: '20.00000000',
    rateDate: transactionDate,
    rateSource: 'PROVIDER' as const,
  };

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
    reversalOfTransactionId: null,
    incomeCategoryId: null,
    expenseCategoryId: null,
    ...baseConversion,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    transactionsRepository = {
      create: jest.fn(),
      findByIdForUser: jest.fn(),
      findReversalForTransaction: jest.fn(),
      findAllByAccountForUser: jest.fn(),
    };

    accountsService = {
      findById: jest.fn(),
    };

    incomeCategoriesService = {
      findById: jest.fn(),
    };

    expenseCategoriesService = {
      findById: jest.fn(),
    };

    exchangeRateService = {
      convertToBaseCurrency: jest.fn().mockResolvedValue({
        baseCurrency: baseConversion.baseCurrency,
        baseAmount: baseConversion.baseAmount,
        exchangeRate: baseConversion.exchangeRate,
        rateDate: baseConversion.rateDate,
        rateSource: baseConversion.rateSource,
      }),
    };

    service = new TransactionsService(
      transactionsRepository,
      accountsService as unknown as AccountsService,
      incomeCategoriesService as unknown as IncomeCategoriesService,
      exchangeRateService as unknown as ExchangeRateService,
      expenseCategoriesService as unknown as ExpenseCategoriesService,
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
        reversalOfTransactionId: null,
        incomeCategoryId: null,
        expenseCategoryId: null,
        ...baseConversion,
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
        reversalOfTransactionId: null,
        incomeCategoryId: null,
        expenseCategoryId: null,
        ...baseConversion,
      });
    });

    it('should convert the amount to the base currency using the transaction date', async () => {
      accountsService.findById.mockResolvedValue(activeAccount);
      transactionsRepository.create.mockResolvedValue(createdTransaction);

      await service.create(createTransactionInput);

      expect(exchangeRateService.convertToBaseCurrency).toHaveBeenCalledWith({
        amount: '50.00',
        fromCurrency: 'MYR',
        rateDate: transactionDate,
      });
    });

    it('should propagate exchange rate unavailability without creating the transaction', async () => {
      accountsService.findById.mockResolvedValue(activeAccount);
      const unavailable = new Error('exchange rate unavailable');
      exchangeRateService.convertToBaseCurrency.mockRejectedValue(unavailable);

      await expect(service.create(createTransactionInput)).rejects.toBe(
        unavailable,
      );

      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should link an income transaction to an income category available to the user', async () => {
      const input = {
        ...createTransactionInput,
        type: TransactionType.INCOME,
        incomeCategoryId: 'category-1',
      };

      accountsService.findById.mockResolvedValue(activeAccount);
      incomeCategoriesService.findById.mockResolvedValue({ id: 'category-1' });
      transactionsRepository.create.mockResolvedValue(createdTransaction);

      await service.create(input);

      expect(incomeCategoriesService.findById).toHaveBeenCalledWith(
        'category-1',
        input.userId,
      );
      expect(transactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TransactionType.INCOME,
          incomeCategoryId: 'category-1',
        }),
      );
    });

    it('should reject an income category on an expense transaction', async () => {
      await expect(
        service.create({
          ...createTransactionInput,
          type: TransactionType.EXPENSE,
          incomeCategoryId: 'category-1',
        }),
      ).rejects.toThrow(InvalidTransactionException);

      expect(incomeCategoriesService.findById).not.toHaveBeenCalled();
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should not create an income transaction when the income category is not available to the user', async () => {
      accountsService.findById.mockResolvedValue(activeAccount);
      incomeCategoriesService.findById.mockRejectedValue(
        new IncomeCategoryNotFoundException(),
      );

      await expect(
        service.create({
          ...createTransactionInput,
          type: TransactionType.INCOME,
          incomeCategoryId: 'category-from-another-user',
        }),
      ).rejects.toBeInstanceOf(IncomeCategoryNotFoundException);

      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should link an expense transaction to an expense category available to the user', async () => {
      const input = {
        ...createTransactionInput,
        type: TransactionType.EXPENSE,
        expenseCategoryId: 'expense-category-1',
      };

      accountsService.findById.mockResolvedValue(activeAccount);
      expenseCategoriesService.findById.mockResolvedValue({
        id: 'expense-category-1',
      });
      transactionsRepository.create.mockResolvedValue(createdTransaction);

      await service.create(input);

      expect(expenseCategoriesService.findById).toHaveBeenCalledWith(
        'expense-category-1',
        input.userId,
      );
      expect(transactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TransactionType.EXPENSE,
          expenseCategoryId: 'expense-category-1',
          incomeCategoryId: null,
        }),
      );
    });

    it('should reject an expense category on an income transaction', async () => {
      await expect(
        service.create({
          ...createTransactionInput,
          type: TransactionType.INCOME,
          expenseCategoryId: 'expense-category-1',
        }),
      ).rejects.toThrow(InvalidTransactionException);

      expect(expenseCategoriesService.findById).not.toHaveBeenCalled();
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should not create an expense transaction when the expense category is not available to the user', async () => {
      accountsService.findById.mockResolvedValue(activeAccount);
      expenseCategoriesService.findById.mockRejectedValue(
        new ExpenseCategoryNotFoundException(),
      );

      await expect(
        service.create({
          ...createTransactionInput,
          type: TransactionType.EXPENSE,
          expenseCategoryId: 'category-from-another-user',
        }),
      ).rejects.toBeInstanceOf(ExpenseCategoryNotFoundException);

      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should not look up an expense category when none is supplied', async () => {
      accountsService.findById.mockResolvedValue(activeAccount);
      transactionsRepository.create.mockResolvedValue(createdTransaction);

      await service.create({
        ...createTransactionInput,
        type: TransactionType.EXPENSE,
        expenseCategoryId: null,
      });

      expect(expenseCategoriesService.findById).not.toHaveBeenCalled();
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
          transactionDate: '2026-02-30',
        }),
      ).rejects.toThrow(InvalidTransactionException);

      expect(accountsService.findById).not.toHaveBeenCalled();
    });
  });

  describe('Reverse', () => {
    it('should create an expense reversal for an income transaction', async () => {
      const originalTransaction = Transaction.create({
        id: 'transaction-1',
        accountId: 'account-1',
        type: TransactionType.INCOME,
        amount: '5000.5000',
        currency: 'MYR',
        description: 'Salary',
        transactionDate: '2026-09-20',
        reversalOfTransactionId: null,
        incomeCategoryId: null,
        expenseCategoryId: null,
        ...baseConversion,
        createdAt: new Date('2026-09-20T10:00:00.000Z'),
        updatedAt: new Date('2026-09-20T10:00:00.000Z'),
      });

      const reversalTransaction = Transaction.create({
        id: 'reversal-1',
        accountId: 'account-1',
        type: TransactionType.EXPENSE,
        amount: '5000.5000',
        currency: 'MYR',
        description: 'Salary reversal',
        transactionDate: '2026-09-21',
        reversalOfTransactionId: 'transaction-1',
        incomeCategoryId: null,
        expenseCategoryId: null,
        ...baseConversion,
        createdAt: new Date('2026-09-21T10:00:00.000Z'),
        updatedAt: new Date('2026-09-21T10:00:00.000Z'),
      });

      transactionsRepository.findByIdForUser.mockResolvedValue(
        originalTransaction,
      );

      transactionsRepository.findReversalForTransaction.mockResolvedValue(null);

      transactionsRepository.create.mockResolvedValue(reversalTransaction);

      const reversalDate = '2026-09-21';

      const result = await service.reverse({
        transactionId: 'transaction-1',
        userId: 'user-1',
        transactionDate: reversalDate,
        description: 'Salary reversal',
      });

      expect(result).toBe(reversalTransaction);

      expect(transactionsRepository.findByIdForUser).toHaveBeenCalledWith(
        'transaction-1',
        'user-1',
      );

      expect(
        transactionsRepository.findReversalForTransaction,
      ).toHaveBeenCalledWith('transaction-1', 'user-1');

      expect(transactionsRepository.create).toHaveBeenCalledWith({
        accountId: 'account-1',
        type: TransactionType.EXPENSE,
        amount: '5000.5000',
        currency: 'MYR',
        description: 'Salary reversal',
        transactionDate: reversalDate,
        reversalOfTransactionId: 'transaction-1',
        incomeCategoryId: null,
        expenseCategoryId: null,
        ...baseConversion,
      });
    });

    it('should create an income reversal for an expense transaction', async () => {
      const originalTransaction = Transaction.create({
        id: 'transaction-1',
        accountId: 'account-1',
        type: TransactionType.EXPENSE,
        amount: '100.0000',
        currency: 'MYR',
        description: 'Groceries',
        transactionDate: '2026-09-20',
        reversalOfTransactionId: null,
        incomeCategoryId: null,
        expenseCategoryId: null,
        ...baseConversion,
        createdAt: new Date('2026-09-20T10:00:00.000Z'),
        updatedAt: new Date('2026-09-20T10:00:00.000Z'),
      });

      const reversalTransaction = Transaction.create({
        id: 'reversal-1',
        accountId: 'account-1',
        type: TransactionType.INCOME,
        amount: '100.0000',
        currency: 'MYR',
        description: 'Groceries reversal',
        transactionDate: '2026-09-21',
        reversalOfTransactionId: 'transaction-1',
        incomeCategoryId: null,
        expenseCategoryId: null,
        ...baseConversion,
        createdAt: new Date('2026-09-21T10:00:00.000Z'),
        updatedAt: new Date('2026-09-21T10:00:00.000Z'),
      });

      transactionsRepository.findByIdForUser.mockResolvedValue(
        originalTransaction,
      );

      transactionsRepository.findReversalForTransaction.mockResolvedValue(null);

      transactionsRepository.create.mockResolvedValue(reversalTransaction);

      const result = await service.reverse({
        transactionId: 'transaction-1',
        userId: 'user-1',
        transactionDate: '2026-09-21',
        description: 'Groceries reversal',
      });

      expect(result.type).toBe(TransactionType.INCOME);

      expect(transactionsRepository.create).toHaveBeenCalledWith({
        accountId: 'account-1',
        type: TransactionType.INCOME,
        amount: '100.0000',
        currency: 'MYR',
        description: 'Groceries reversal',
        transactionDate: '2026-09-21',
        reversalOfTransactionId: 'transaction-1',
        incomeCategoryId: null,
        expenseCategoryId: null,
        ...baseConversion,
      });
    });

    it('should reject reversal when the original transaction does not exist', async () => {
      transactionsRepository.findByIdForUser.mockResolvedValue(null);

      await expect(
        service.reverse({
          transactionId: 'transaction-1',
          userId: 'user-1',
          transactionDate: '2026-09-21',
          description: 'Reversal',
        }),
      ).rejects.toThrow(TransactionNotFoundException);

      expect(transactionsRepository.findByIdForUser).toHaveBeenCalledWith(
        'transaction-1',
        'user-1',
      );

      expect(
        transactionsRepository.findReversalForTransaction,
      ).not.toHaveBeenCalled();

      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should reject reversing a reversal transaction', async () => {
      const reversalTransaction = Transaction.create({
        id: 'reversal-1',
        accountId: 'account-1',
        type: TransactionType.EXPENSE,
        amount: '100.0000',
        currency: 'MYR',
        description: 'Reversal',
        transactionDate: '2026-09-21',
        reversalOfTransactionId: 'transaction-1',
        incomeCategoryId: null,
        expenseCategoryId: null,
        ...baseConversion,
        createdAt: new Date('2026-09-21T10:00:00.000Z'),
        updatedAt: new Date('2026-09-21T10:00:00.000Z'),
      });

      transactionsRepository.findByIdForUser.mockResolvedValue(
        reversalTransaction,
      );

      await expect(
        service.reverse({
          transactionId: 'reversal-1',
          userId: 'user-1',
          transactionDate: '2026-09-22',
          description: 'Invalid reversal',
        }),
      ).rejects.toThrow(InvalidTransactionException);

      expect(
        transactionsRepository.findReversalForTransaction,
      ).not.toHaveBeenCalled();

      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should reject a transaction that has already been reversed', async () => {
      const originalTransaction = Transaction.create({
        id: 'transaction-1',
        accountId: 'account-1',
        type: TransactionType.EXPENSE,
        amount: '100.0000',
        currency: 'MYR',
        description: 'Groceries',
        transactionDate: '2026-09-20',
        reversalOfTransactionId: null,
        incomeCategoryId: null,
        expenseCategoryId: null,
        ...baseConversion,
        createdAt: new Date('2026-09-20T10:00:00.000Z'),
        updatedAt: new Date('2026-09-20T10:00:00.000Z'),
      });

      const existingReversal = Transaction.create({
        id: 'reversal-1',
        accountId: 'account-1',
        type: TransactionType.INCOME,
        amount: '100.0000',
        currency: 'MYR',
        description: 'Existing reversal',
        transactionDate: '2026-09-21',
        reversalOfTransactionId: 'transaction-1',
        incomeCategoryId: null,
        expenseCategoryId: null,
        ...baseConversion,
        createdAt: new Date('2026-09-21T10:00:00.000Z'),
        updatedAt: new Date('2026-09-21T10:00:00.000Z'),
      });

      transactionsRepository.findByIdForUser.mockResolvedValue(
        originalTransaction,
      );

      transactionsRepository.findReversalForTransaction.mockResolvedValue(
        existingReversal,
      );

      await expect(
        service.reverse({
          transactionId: 'transaction-1',
          userId: 'user-1',
          transactionDate: '2026-09-22',
          description: 'Second reversal',
        }),
      ).rejects.toThrow(InvalidTransactionException);

      expect(
        transactionsRepository.findReversalForTransaction,
      ).toHaveBeenCalledWith('transaction-1', 'user-1');

      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should reject an invalid reversal date', async () => {
      await expect(
        service.reverse({
          transactionId: 'transaction-1',
          userId: 'user-1',
          transactionDate: 'invalid',
          description: 'Reversal',
        }),
      ).rejects.toThrow(InvalidTransactionException);

      expect(transactionsRepository.findByIdForUser).not.toHaveBeenCalled();

      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should reject an excessive reversal description', async () => {
      await expect(
        service.reverse({
          transactionId: 'transaction-1',
          userId: 'user-1',
          transactionDate: '2026-09-21',
          description: 'a'.repeat(256),
        }),
      ).rejects.toThrow(InvalidTransactionException);

      expect(transactionsRepository.findByIdForUser).not.toHaveBeenCalled();

      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should trim the reversal description', async () => {
      const originalTransaction = Transaction.create({
        id: 'transaction-1',
        accountId: 'account-1',
        type: TransactionType.EXPENSE,
        amount: '50.0000',
        currency: 'MYR',
        description: 'Lunch',
        transactionDate: '2026-09-20',
        reversalOfTransactionId: null,
        incomeCategoryId: null,
        expenseCategoryId: null,
        ...baseConversion,
        createdAt: new Date('2026-09-20T10:00:00.000Z'),
        updatedAt: new Date('2026-09-20T10:00:00.000Z'),
      });

      transactionsRepository.findByIdForUser.mockResolvedValue(
        originalTransaction,
      );

      transactionsRepository.findReversalForTransaction.mockResolvedValue(null);

      transactionsRepository.create.mockResolvedValue(createdTransaction);

      await service.reverse({
        transactionId: 'transaction-1',
        userId: 'user-1',
        transactionDate: '2026-09-21',
        description: '  Lunch reversal  ',
      });

      expect(transactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Lunch reversal',
          reversalOfTransactionId: 'transaction-1',
        }),
      );
    });
  });

  describe('FindById', () => {
    it('should return the transaction when found', async () => {
      const transaction = Transaction.create({
        id: 'transaction-id',
        accountId: 'account-id',
        type: TransactionType.EXPENSE,
        amount: '50.0000',
        currency: 'MYR',
        description: 'Lunch',
        transactionDate: '2026-09-01',
        reversalOfTransactionId: null,
        incomeCategoryId: null,
        expenseCategoryId: null,
        ...baseConversion,
        createdAt: new Date('2026-09-01T10:00:00.000Z'),
        updatedAt: new Date('2026-09-01T10:00:00.000Z'),
      });

      transactionsRepository.findByIdForUser.mockResolvedValue(transaction);

      const result = await service.findById('transaction-id', 'user-id');

      expect(result).toBe(transaction);

      expect(transactionsRepository.findByIdForUser).toHaveBeenCalledWith(
        'transaction-id',
        'user-id',
      );
    });

    it('should throw TransactionNotFoundException when transaction does not exist', async () => {
      transactionsRepository.findByIdForUser.mockResolvedValue(null);

      await expect(
        service.findById('transaction-id', 'user-id'),
      ).rejects.toThrow(TransactionNotFoundException);

      expect(transactionsRepository.findByIdForUser).toHaveBeenCalledWith(
        'transaction-id',
        'user-id',
      );
    });
  });

  describe('FindAll', () => {
    it('should return transactions for the account', async () => {
      const transactions = [createdTransaction];

      const input: ListTransactionsInput = {
        accountId: activeAccount.id,
        userId: 'user-1',
        offset: 0,
        limit: 20,
      };

      accountsService.findById.mockResolvedValue(activeAccount);

      transactionsRepository.findAllByAccountForUser.mockResolvedValue({
        transactions,
        total: 1,
      });

      const result = await service.findAll(input);

      expect(result).toEqual({
        transactions,
        total: 1,
      });

      expect(accountsService.findById).toHaveBeenCalledWith(
        activeAccount.id,
        input.userId,
      );

      expect(
        transactionsRepository.findAllByAccountForUser,
      ).toHaveBeenCalledWith(input);
    });

    it('should pass the pagination values to the repository', async () => {
      const input: ListTransactionsInput = {
        accountId: activeAccount.id,
        userId: 'user-1',
        offset: 20,
        limit: 10,
      };

      accountsService.findById.mockResolvedValue(activeAccount);

      transactionsRepository.findAllByAccountForUser.mockResolvedValue({
        transactions: [createdTransaction],
        total: 25,
      });

      const result = await service.findAll(input);

      expect(result).toEqual({
        transactions: [createdTransaction],
        total: 25,
      });

      expect(
        transactionsRepository.findAllByAccountForUser,
      ).toHaveBeenCalledWith({
        accountId: activeAccount.id,
        userId: 'user-1',
        offset: 20,
        limit: 10,
      });
    });

    it('should verify account ownership before retrieving transactions', async () => {
      const input: ListTransactionsInput = {
        accountId: activeAccount.id,
        userId: 'user-1',
        offset: 0,
        limit: 20,
      };

      accountsService.findById.mockResolvedValue(activeAccount);

      transactionsRepository.findAllByAccountForUser.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      await service.findAll(input);

      expect(accountsService.findById).toHaveBeenCalledWith(
        activeAccount.id,
        'user-1',
      );

      expect(transactionsRepository.findAllByAccountForUser).toHaveBeenCalled();
    });

    it('should not retrieve transactions when account ownership validation fails', async () => {
      const input: ListTransactionsInput = {
        accountId: activeAccount.id,
        userId: 'user-2',
        offset: 0,
        limit: 20,
      };

      const error = new Error('Account not found');

      accountsService.findById.mockRejectedValue(error);

      await expect(service.findAll(input)).rejects.toThrow('Account not found');

      expect(
        transactionsRepository.findAllByAccountForUser,
      ).not.toHaveBeenCalled();
    });

    it('should return an empty result when the account has no transactions', async () => {
      const input: ListTransactionsInput = {
        accountId: activeAccount.id,
        userId: 'user-1',
        offset: 0,
        limit: 20,
      };

      accountsService.findById.mockResolvedValue(activeAccount);

      transactionsRepository.findAllByAccountForUser.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const result = await service.findAll(input);

      expect(result).toEqual({
        transactions: [],
        total: 0,
      });
    });
  });
});
