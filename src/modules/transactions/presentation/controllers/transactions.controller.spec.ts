import { TransactionsController } from './transactions.controller';
import { TransactionsService } from '../../application/services/transactions.service';
import {
  Transaction,
  TransactionType,
} from '../../domain/entities/transaction.entity';
import { TransactionNotFoundException } from '../exceptions/transaction-not-found.exception';
import type { AuthenticatedRequest } from '../../../auth/infrastructure/interfaces/authenticated-request.interface';

describe('TransactionsController', () => {
  let controller: TransactionsController;

  let transactionsService: {
    create: jest.Mock;
    findById: jest.Mock;
    findAll: jest.Mock;
    reverse: jest.Mock;
  };

  const transactionDate = '2026-09-01';
  const fxFields = {
    expenseCategoryId: null,
    baseCurrency: 'INR',
    baseAmount: '5000.0000',
    exchangeRate: '100.00000000',
    rateDate: '2026-09-01',
    rateSource: 'PROVIDER' as const,
  };

  const transaction = {
    id: 'transaction-1',
    accountId: 'account-1',
    type: TransactionType.EXPENSE,
    amount: '50.00',
    currency: 'MYR',
    description: 'Lunch',
    transactionDate,
    reversalOfTransactionId: null,
    incomeCategoryId: null,
    ...fxFields,
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
  };

  const transactionEntity = Transaction.create({
    id: 'transaction-id',
    accountId: 'account-id',
    type: TransactionType.EXPENSE,
    amount: '50.0000',
    currency: 'MYR',
    description: 'Lunch',
    transactionDate: '2026-09-01',
    reversalOfTransactionId: null,
    incomeCategoryId: null,
    ...fxFields,
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
  });

  const authenticatedRequest = {
    user: {
      userId: 'user-id',
      email: 'user@example.com',
    },
  } as AuthenticatedRequest;

  beforeEach(() => {
    transactionsService = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      reverse: jest.fn(),
    };

    controller = new TransactionsController(
      transactionsService as unknown as TransactionsService,
    );
  });

  describe('Create', () => {
    it('should create a transaction for the authenticated user', async () => {
      transactionsService.create.mockResolvedValue(transaction);

      const request = {
        user: {
          userId: 'user-1',
          email: 'user@example.com',
        },
      };

      const dto = {
        accountId: 'account-1',
        type: TransactionType.EXPENSE,
        amount: '50.00',
        currency: 'MYR',
        description: 'Lunch',
        transactionDate,
      };

      const result = await controller.create(dto, request as never);

      expect(transactionsService.create).toHaveBeenCalledWith({
        userId: 'user-1',
        accountId: 'account-1',
        type: TransactionType.EXPENSE,
        amount: '50.00',
        currency: 'MYR',
        description: 'Lunch',
        transactionDate,
        incomeCategoryId: null,
        expenseCategoryId: null,
      });

      expect(result).toEqual({
        success: true,
        data: {
          id: transaction.id,
          accountId: transaction.accountId,
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          transactionDate: transaction.transactionDate,
          incomeCategoryId: null,
          reversalOfTransactionId: null,
          ...fxFields,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
        },
        meta: {},
      });
    });

    it('should convert missing description to null', async () => {
      transactionsService.create.mockResolvedValue(transaction);

      const request = {
        user: {
          userId: 'user-1',
          email: 'user@example.com',
        },
      };

      const dto = {
        accountId: 'account-1',
        type: TransactionType.EXPENSE,
        amount: '50.00',
        currency: 'MYR',
        transactionDate,
      };

      await controller.create(dto, request as never);

      expect(transactionsService.create).toHaveBeenCalledWith({
        userId: 'user-1',
        accountId: 'account-1',
        type: TransactionType.EXPENSE,
        amount: '50.00',
        currency: 'MYR',
        description: null,
        transactionDate,
        incomeCategoryId: null,
        expenseCategoryId: null,
      });
    });
  });

  describe('FindById', () => {
    it('should retrieve a transaction for the authenticated user', async () => {
      transactionsService.findById.mockResolvedValue(transactionEntity);

      const result = await controller.findById(
        'transaction-id',
        authenticatedRequest,
      );

      expect(result).toEqual({
        success: true,
        data: {
          id: 'transaction-id',
          accountId: 'account-id',
          type: TransactionType.EXPENSE,
          amount: '50.0000',
          currency: 'MYR',
          description: 'Lunch',
          transactionDate: '2026-09-01',
          incomeCategoryId: null,
          ...fxFields,
          reversalOfTransactionId: null,
          createdAt: new Date('2026-09-01T10:00:00.000Z'),
          updatedAt: new Date('2026-09-01T10:00:00.000Z'),
        },
        meta: {},
      });

      expect(transactionsService.findById).toHaveBeenCalledWith(
        'transaction-id',
        'user-id',
      );
    });

    it('should pass the authenticated user id to the service', async () => {
      transactionsService.findById.mockResolvedValue(transactionEntity);

      await controller.findById('transaction-id', authenticatedRequest);

      expect(transactionsService.findById).toHaveBeenCalledWith(
        'transaction-id',
        'user-id',
      );
    });

    it('should pass the transaction id to the service', async () => {
      transactionsService.findById.mockResolvedValue(transactionEntity);

      await controller.findById('transaction-123', authenticatedRequest);

      expect(transactionsService.findById).toHaveBeenCalledWith(
        'transaction-123',
        'user-id',
      );
    });

    it('should propagate a transaction not found exception', async () => {
      const error = new TransactionNotFoundException('Transaction not found');

      transactionsService.findById.mockRejectedValue(error);

      await expect(
        controller.findById('transaction-id', authenticatedRequest),
      ).rejects.toThrow(TransactionNotFoundException);

      expect(transactionsService.findById).toHaveBeenCalledWith(
        'transaction-id',
        'user-id',
      );
    });
  });

  describe('FindAll', () => {
    it('should return paginated transactions for the authenticated user', async () => {
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
        ...fxFields,
        createdAt: new Date('2026-09-01T10:00:00.000Z'),
        updatedAt: new Date('2026-09-01T10:00:00.000Z'),
      });

      transactionsService.findAll.mockResolvedValue({
        transactions: [transaction],
        total: 21,
      });

      const query = {
        accountId: 'account-id',
        page: 2,
        limit: 10,
      };

      const request = {
        user: {
          userId: 'user-id',
        },
      } as AuthenticatedRequest;

      const result = await controller.findAll(query, request);

      expect(result).toEqual({
        success: true,
        data: {
          items: [
            {
              id: 'transaction-id',
              accountId: 'account-id',
              type: TransactionType.EXPENSE,
              amount: '50.0000',
              currency: 'MYR',
              description: 'Lunch',
              transactionDate: '2026-09-01',
              incomeCategoryId: null,
              ...fxFields,
              reversalOfTransactionId: null,
              createdAt: transaction.createdAt,
              updatedAt: transaction.updatedAt,
            },
          ],
        },
        meta: {
          page: 2,
          limit: 10,
          total: 21,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      });

      expect(transactionsService.findAll).toHaveBeenCalledWith({
        accountId: 'account-id',
        userId: 'user-id',
        offset: 10,
        limit: 10,
      });
    });

    it('should calculate zero offset for the first page', async () => {
      transactionsService.findAll.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const query = {
        accountId: 'account-id',
        page: 1,
        limit: 20,
      };

      const request = {
        user: {
          userId: 'user-id',
        },
      } as AuthenticatedRequest;

      const result = await controller.findAll(query, request);

      expect(result).toEqual({
        success: true,
        data: { items: [] },
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      expect(transactionsService.findAll).toHaveBeenCalledWith({
        accountId: 'account-id',
        userId: 'user-id',
        offset: 0,
        limit: 20,
      });
    });

    it('should calculate the correct offset for later pages', async () => {
      transactionsService.findAll.mockResolvedValue({
        transactions: [],
        total: 50,
      });

      const query = {
        accountId: 'account-id',
        page: 4,
        limit: 10,
      };

      const request = {
        user: {
          userId: 'user-id',
        },
      } as AuthenticatedRequest;

      await controller.findAll(query, request);

      expect(transactionsService.findAll).toHaveBeenCalledWith({
        accountId: 'account-id',
        userId: 'user-id',
        offset: 30,
        limit: 10,
      });
    });

    it('should indicate when there is no next page', async () => {
      transactionsService.findAll.mockResolvedValue({
        transactions: [],
        total: 20,
      });

      const query = {
        accountId: 'account-id',
        page: 2,
        limit: 10,
      };

      const request = {
        user: {
          userId: 'user-id',
        },
      } as AuthenticatedRequest;

      const result = await controller.findAll(query, request);

      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 20,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('should propagate errors from the service', async () => {
      const error = new Error('Account not found');

      transactionsService.findAll.mockRejectedValue(error);

      const query = {
        accountId: 'account-id',
        page: 1,
        limit: 20,
      };

      const request = {
        user: {
          userId: 'user-id',
        },
      } as AuthenticatedRequest;

      await expect(controller.findAll(query, request)).rejects.toThrow(
        'Account not found',
      );
    });
  });

  describe('Reverse', () => {
    it('should create a reversal for the authenticated user', async () => {
      const reversalDate = '2026-09-02';

      const reversalTransaction = Transaction.create({
        id: 'reversal-1',
        accountId: 'account-id',
        type: TransactionType.INCOME,
        amount: '50.0000',
        currency: 'MYR',
        description: 'Lunch reversal',
        transactionDate: reversalDate,
        reversalOfTransactionId: 'transaction-id',
        incomeCategoryId: null,
        ...fxFields,
        createdAt: new Date('2026-09-02T10:00:00.000Z'),
        updatedAt: new Date('2026-09-02T10:00:00.000Z'),
      });

      transactionsService.reverse.mockResolvedValue(reversalTransaction);

      const dto = {
        transactionDate: reversalDate,
        description: 'Lunch reversal',
      };

      const result = await controller.reverse(
        'transaction-id',
        dto,
        authenticatedRequest,
      );

      expect(transactionsService.reverse).toHaveBeenCalledWith({
        transactionId: 'transaction-id',
        userId: 'user-id',
        transactionDate: reversalDate,
        description: 'Lunch reversal',
      });

      expect(result).toEqual({
        success: true,
        data: {
          id: 'reversal-1',
          accountId: 'account-id',
          type: TransactionType.INCOME,
          amount: '50.0000',
          currency: 'MYR',
          description: 'Lunch reversal',
          transactionDate: reversalDate,
          incomeCategoryId: null,
          reversalOfTransactionId: 'transaction-id',
          ...fxFields,
          createdAt: new Date('2026-09-02T10:00:00.000Z'),
          updatedAt: new Date('2026-09-02T10:00:00.000Z'),
        },
        meta: {},
      });
    });

    it('should convert missing reversal description to null', async () => {
      const reversalDate = '2026-09-02';

      transactionsService.reverse.mockResolvedValue(transactionEntity);

      const dto = {
        transactionDate: reversalDate,
      };

      await controller.reverse('transaction-id', dto, authenticatedRequest);

      expect(transactionsService.reverse).toHaveBeenCalledWith({
        transactionId: 'transaction-id',
        userId: 'user-id',
        transactionDate: reversalDate,
        description: null,
      });
    });

    it('should pass the authenticated user id to the reversal service', async () => {
      const reversalDate = '2026-09-02';

      transactionsService.reverse.mockResolvedValue(transactionEntity);

      await controller.reverse(
        'transaction-123',
        {
          transactionDate: reversalDate,
          description: 'Reversal',
        },
        authenticatedRequest,
      );

      expect(transactionsService.reverse).toHaveBeenCalledWith({
        transactionId: 'transaction-123',
        userId: 'user-id',
        transactionDate: reversalDate,
        description: 'Reversal',
      });
    });

    it('should propagate errors from the reversal service', async () => {
      const error = new Error('Transaction has already been reversed');

      transactionsService.reverse.mockRejectedValue(error);

      await expect(
        controller.reverse(
          'transaction-id',
          {
            transactionDate: '2026-09-02T00:00:00.000Z',
            description: 'Second reversal',
          },
          authenticatedRequest,
        ),
      ).rejects.toThrow('Transaction has already been reversed');
    });
  });
});
