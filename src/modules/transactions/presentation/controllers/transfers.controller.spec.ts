import { TransfersController } from './transfers.controller';
import { TransfersService } from '../../application/services/transfers.service';
import {
  Transaction,
  TransactionType,
} from '../../domain/entities/transaction.entity';
import type { AuthenticatedRequest } from '../../../auth/infrastructure/interfaces/authenticated-request.interface';

describe('TransfersController', () => {
  let controller: TransfersController;

  let transfersService: {
    create: jest.Mock;
    reverse: jest.Mock;
  };

  const transferGroupId = '6f1c2a8e-3b4d-4c5e-8f9a-0b1c2d3e4f50';
  const fxFields = {
    baseCurrency: 'INR',
    baseAmount: '1000.0000',
    exchangeRate: '20.00000000',
    rateDate: '2026-09-01',
    rateSource: 'PROVIDER' as const,
  };

  const createLeg = (id: string, type: TransactionType) =>
    Transaction.create({
      id,
      accountId: 'account-1',
      type,
      amount: '50.0000',
      currency: 'MYR',
      description: null,
      transactionDate: '2026-09-01',
      reversalOfTransactionId: null,
      incomeCategoryId: null,
      expenseCategoryId: null,
      ...fxFields,
      transferGroupId,
      transferExchangeRate: '20.00000000',
      transferRateSource: 'PROVIDER',
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
      updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    });

  const pair = {
    transferGroupId,
    outLeg: createLeg('out-leg', TransactionType.TRANSFER_OUT),
    inLeg: createLeg('in-leg', TransactionType.TRANSFER_IN),
  };

  const request = {
    user: {
      userId: 'user-1',
    },
  };

  beforeEach(() => {
    transfersService = {
      create: jest.fn().mockResolvedValue(pair),
      reverse: jest.fn().mockResolvedValue(pair),
    };

    controller = new TransfersController(
      transfersService as unknown as TransfersService,
    );
  });

  describe('create', () => {
    it('passes the authenticated user and payload to the service', async () => {
      const dto = {
        sourceAccountId: 'account-1',
        destinationAccountId: 'account-2',
        amount: '50.00',
        transactionDate: '2026-09-01',
        description: 'Savings top-up',
      };

      await controller.create(dto, request as unknown as AuthenticatedRequest);

      expect(transfersService.create).toHaveBeenCalledWith({
        userId: 'user-1',
        sourceAccountId: 'account-1',
        destinationAccountId: 'account-2',
        amount: '50.00',
        transactionDate: '2026-09-01',
        description: 'Savings top-up',
      });
    });

    it('defaults a missing description to null', async () => {
      await controller.create(
        {
          sourceAccountId: 'account-1',
          destinationAccountId: 'account-2',
          amount: '50.00',
          transactionDate: '2026-09-01',
        },
        request as unknown as AuthenticatedRequest,
      );

      expect(transfersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: null }),
      );
    });

    it('wraps the transfer pair in the success envelope', async () => {
      const result = await controller.create(
        {
          sourceAccountId: 'account-1',
          destinationAccountId: 'account-2',
          amount: '50.00',
          transactionDate: '2026-09-01',
        },
        request as unknown as AuthenticatedRequest,
      );

      expect(result).toEqual({
        success: true,
        data: {
          transferGroupId,
          outLeg: expect.objectContaining({
            id: 'out-leg',
            type: TransactionType.TRANSFER_OUT,
            transferGroupId,
          }),
          inLeg: expect.objectContaining({
            id: 'in-leg',
            type: TransactionType.TRANSFER_IN,
            transferGroupId,
          }),
        },
        meta: {},
      });
    });
  });

  describe('reverse', () => {
    it('passes the transaction id, user, and payload to the service', async () => {
      await controller.reverse(
        'in-leg',
        {
          transactionDate: '2026-09-02',
          description: 'Undo transfer',
        },
        request as unknown as AuthenticatedRequest,
      );

      expect(transfersService.reverse).toHaveBeenCalledWith({
        transactionId: 'in-leg',
        userId: 'user-1',
        transactionDate: '2026-09-02',
        description: 'Undo transfer',
      });
    });

    it('returns the reversal pair in the success envelope', async () => {
      const result = await controller.reverse(
        'out-leg',
        { transactionDate: '2026-09-02' },
        request as unknown as AuthenticatedRequest,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          transferGroupId,
          outLeg: expect.objectContaining({ id: 'out-leg' }),
          inLeg: expect.objectContaining({ id: 'in-leg' }),
        }),
      );
    });
  });
});
