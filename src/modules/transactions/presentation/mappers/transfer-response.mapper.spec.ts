import {
  Transaction,
  TransactionType,
} from '../../domain/entities/transaction.entity';
import { TransferPair } from '../../application/outputs/transfer-pair.output';
import { TransferResponseMapper } from './transfer-response.mapper';

const TRANSFER_GROUP_ID = '6f1c2a8e-3b4d-4c5e-8f9a-0b1c2d3e4f50';

const createLeg = (
  overrides: Partial<{
    id: string;
    accountId: string;
    type: TransactionType;
    amount: string;
    currency: string;
    transferExchangeRate: string | null;
    transferRateSource: 'IDENTITY' | 'PROVIDER' | 'FALLBACK' | 'MANUAL' | null;
  }> = {},
) =>
  Transaction.create({
    id: 'leg-1',
    accountId: 'account-1',
    type: TransactionType.TRANSFER_OUT,
    amount: '50.0000',
    currency: 'MYR',
    description: 'Savings top-up',
    transactionDate: '2026-09-01',
    reversalOfTransactionId: null,
    incomeCategoryId: null,
    expenseCategoryId: null,
    baseCurrency: 'INR',
    baseAmount: '1000.0000',
    exchangeRate: '20.00000000',
    rateDate: '2026-09-01',
    rateSource: 'PROVIDER',
    transferGroupId: TRANSFER_GROUP_ID,
    transferExchangeRate: '20.00000000',
    transferRateSource: 'PROVIDER',
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
  });

describe('TransferResponseMapper', () => {
  it('maps the transfer group and both legs with transfer rate fields', () => {
    const pair: TransferPair = {
      transferGroupId: TRANSFER_GROUP_ID,
      outLeg: createLeg(),
      inLeg: createLeg({
        id: 'leg-2',
        accountId: 'account-2',
        type: TransactionType.TRANSFER_IN,
        amount: '1000.0000',
        currency: 'INR',
      }),
    };

    const dto = TransferResponseMapper.toDto(pair);

    expect(dto).toEqual({
      transferGroupId: TRANSFER_GROUP_ID,
      outLeg: expect.objectContaining({
        id: 'leg-1',
        type: TransactionType.TRANSFER_OUT,
        amount: '50.0000',
        currency: 'MYR',
        transferGroupId: TRANSFER_GROUP_ID,
        transferExchangeRate: '20.00000000',
        transferRateSource: 'PROVIDER',
        baseCurrency: 'INR',
        baseAmount: '1000.0000',
      }),
      inLeg: expect.objectContaining({
        id: 'leg-2',
        accountId: 'account-2',
        type: TransactionType.TRANSFER_IN,
        amount: '1000.0000',
        currency: 'INR',
        transferGroupId: TRANSFER_GROUP_ID,
      }),
    });
  });

  it('keeps the single-leg transaction fields on each leg', () => {
    const dto = TransferResponseMapper.toDto({
      transferGroupId: TRANSFER_GROUP_ID,
      outLeg: createLeg(),
      inLeg: createLeg({ id: 'leg-2', type: TransactionType.TRANSFER_IN }),
    });

    expect(dto.outLeg).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        description: 'Savings top-up',
        transactionDate: '2026-09-01',
        reversalOfTransactionId: null,
        incomeCategoryId: null,
        expenseCategoryId: null,
        rateDate: '2026-09-01',
        rateSource: 'PROVIDER',
        createdAt: new Date('2026-09-01T10:00:00.000Z'),
        updatedAt: new Date('2026-09-01T10:00:00.000Z'),
      }),
    );
  });

  it('returns null transfer rate fields when the leg has none', () => {
    const dto = TransferResponseMapper.toDto({
      transferGroupId: TRANSFER_GROUP_ID,
      outLeg: createLeg({
        transferExchangeRate: null,
        transferRateSource: null,
      }),
      inLeg: createLeg({ id: 'leg-2', type: TransactionType.TRANSFER_IN }),
    });

    expect(dto.outLeg.transferExchangeRate).toBeNull();
    expect(dto.outLeg.transferRateSource).toBeNull();
  });
});
