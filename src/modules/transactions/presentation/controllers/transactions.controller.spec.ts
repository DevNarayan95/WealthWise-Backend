import { TransactionsController } from './transactions.controller';
import { TransactionsService } from '../../application/services/transactions.service';
import { TransactionType } from '../../domain/entities/transaction.entity';

describe('TransactionsController', () => {
  let controller: TransactionsController;

  let transactionsService: {
    create: jest.Mock;
  };

  const transactionDate = new Date('2026-09-01T00:00:00.000Z');

  const transaction = {
    id: 'transaction-1',
    accountId: 'account-1',
    type: TransactionType.EXPENSE,
    amount: '50.00',
    currency: 'MYR',
    description: 'Lunch',
    transactionDate,
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
  };

  beforeEach(() => {
    transactionsService = {
      create: jest.fn(),
    };

    controller = new TransactionsController(
      transactionsService as never as TransactionsService,
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
        transactionDate: transactionDate.toISOString(),
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
        transactionDate: transactionDate.toISOString(),
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
      });
    });
  });
});
