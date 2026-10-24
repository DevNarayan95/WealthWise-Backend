import { AccountStatus } from '../../../accounts/domain/entities/account.entity';
import { AccountsService } from '../../../accounts/application/services/accounts.service';
import { ExchangeRateService } from '../../../fx/application/services/exchange-rate.service';
import { ExchangeRateUnavailableException } from '../../../fx/presentation/exceptions/exchange-rate-unavailable.exception';

import {
  Transaction,
  TransactionProps,
  TransactionType,
} from '../../domain/entities/transaction.entity';
import { TransactionRepository } from '../../domain/repositories/transaction.repository';

import { InvalidTransactionException } from '../../presentation/exceptions/invalid-transaction.exception';
import { TransactionCannotBeReversedException } from '../../presentation/exceptions/transaction-cannot-be-reversed.exception';
import { TransactionNotFoundException } from '../../presentation/exceptions/transaction-not-found.exception';

import { TransfersService } from './transfers.service';

const USER_ID = 'user-1';
const SOURCE_ACCOUNT_ID = 'source-account';
const DESTINATION_ACCOUNT_ID = 'destination-account';
const TRANSFER_DATE = '2026-09-01';
const ORIGINAL_GROUP_ID = '6f1c2a8e-3b4d-4c5e-8f9a-0b1c2d3e4f50';
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createAccount = (overrides: Record<string, unknown> = {}) => ({
  id: SOURCE_ACCOUNT_ID,
  currency: 'MYR',
  status: AccountStatus.ACTIVE,
  ...overrides,
});

const createLeg = (overrides: Partial<TransactionProps> = {}) =>
  Transaction.create({
    id: 'out-leg',
    accountId: SOURCE_ACCOUNT_ID,
    type: TransactionType.TRANSFER_OUT,
    amount: '50.0000',
    currency: 'MYR',
    description: null,
    transactionDate: TRANSFER_DATE,
    reversalOfTransactionId: null,
    incomeCategoryId: null,
    expenseCategoryId: null,
    baseCurrency: 'INR',
    baseAmount: '1000.0000',
    exchangeRate: '20.00000000',
    rateDate: TRANSFER_DATE,
    rateSource: 'PROVIDER',
    transferGroupId: ORIGINAL_GROUP_ID,
    transferExchangeRate: '20.00000000',
    transferRateSource: 'PROVIDER',
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
  });

const outLeg = createLeg();

const inLeg = createLeg({
  id: 'in-leg',
  accountId: DESTINATION_ACCOUNT_ID,
  type: TransactionType.TRANSFER_IN,
  amount: '1000.0000',
  currency: 'INR',
  baseAmount: '1000.0000',
  exchangeRate: '1.00000000',
  rateSource: 'IDENTITY',
  transferRateSource: 'PROVIDER',
});

describe('TransfersService', () => {
  let service: TransfersService;

  let transactionsRepository: {
    createTransferLegs: jest.Mock;
    findByIdForUser: jest.Mock;
    findTransferLegsByGroupForUser: jest.Mock;
    findReversalForTransaction: jest.Mock;
  };

  let accountsService: {
    findById: jest.Mock;
  };

  let exchangeRateService: {
    getRate: jest.Mock;
    convertToBaseCurrency: jest.Mock;
  };

  const baseConversion = (overrides: Record<string, unknown> = {}) => ({
    baseCurrency: 'INR',
    baseAmount: '1000.0000',
    exchangeRate: '20.00000000',
    rateDate: TRANSFER_DATE,
    rateSource: 'PROVIDER' as const,
    ...overrides,
  });

  const createInput = {
    userId: USER_ID,
    sourceAccountId: SOURCE_ACCOUNT_ID,
    destinationAccountId: DESTINATION_ACCOUNT_ID,
    amount: '50.00',
    transactionDate: TRANSFER_DATE,
    description: 'Savings top-up',
  };

  beforeEach(() => {
    transactionsRepository = {
      createTransferLegs: jest.fn(),
      findByIdForUser: jest.fn(),
      findTransferLegsByGroupForUser: jest.fn(),
      findReversalForTransaction: jest.fn().mockResolvedValue(null),
    };

    accountsService = {
      findById: jest.fn(async (accountId: string) =>
        accountId === SOURCE_ACCOUNT_ID
          ? createAccount()
          : createAccount({
              id: DESTINATION_ACCOUNT_ID,
              currency: 'INR',
            }),
      ),
    };

    exchangeRateService = {
      getRate: jest.fn().mockResolvedValue({
        rate: 20,
        rateDate: TRANSFER_DATE,
        source: 'PROVIDER',
      }),
      convertToBaseCurrency: jest.fn().mockResolvedValue(baseConversion()),
    };

    transactionsRepository.createTransferLegs.mockImplementation(
      async ([outInput, inInput]: Array<Record<string, unknown>>) => [
        createLeg({
          id: 'created-out',
          transferGroupId: outInput.transferGroupId as string,
        }),
        createLeg({
          id: 'created-in',
          accountId: DESTINATION_ACCOUNT_ID,
          type: TransactionType.TRANSFER_IN,
          currency: 'INR',
          amount: '1000.0000',
          transferGroupId: inInput.transferGroupId as string,
        }),
      ],
    );

    service = new TransfersService(
      transactionsRepository as unknown as TransactionRepository,
      accountsService as unknown as AccountsService,
      exchangeRateService as unknown as ExchangeRateService,
    );
  });

  describe('create', () => {
    it('rejects a transfer from an account to itself', async () => {
      await expect(
        service.create({
          ...createInput,
          destinationAccountId: SOURCE_ACCOUNT_ID,
        }),
      ).rejects.toBeInstanceOf(InvalidTransactionException);

      expect(transactionsRepository.createTransferLegs).not.toHaveBeenCalled();
    });

    it.each(['0', '-5', '1.00001', 'abc'])(
      'rejects invalid amount %s',
      async (amount) => {
        await expect(
          service.create({ ...createInput, amount }),
        ).rejects.toBeInstanceOf(InvalidTransactionException);

        expect(
          transactionsRepository.createTransferLegs,
        ).not.toHaveBeenCalled();
      },
    );

    it('rejects an invalid transaction date', async () => {
      await expect(
        service.create({ ...createInput, transactionDate: '2026-02-30' }),
      ).rejects.toBeInstanceOf(InvalidTransactionException);

      expect(transactionsRepository.createTransferLegs).not.toHaveBeenCalled();
    });

    it('rejects a description longer than 255 characters', async () => {
      await expect(
        service.create({ ...createInput, description: 'x'.repeat(256) }),
      ).rejects.toBeInstanceOf(InvalidTransactionException);
    });

    it('rejects an archived source account', async () => {
      accountsService.findById.mockImplementation(async (accountId: string) =>
        accountId === SOURCE_ACCOUNT_ID
          ? createAccount({ status: AccountStatus.ARCHIVED })
          : createAccount({ id: DESTINATION_ACCOUNT_ID, currency: 'INR' }),
      );

      await expect(service.create(createInput)).rejects.toBeInstanceOf(
        InvalidTransactionException,
      );

      expect(transactionsRepository.createTransferLegs).not.toHaveBeenCalled();
    });

    it('rejects an archived destination account', async () => {
      accountsService.findById.mockImplementation(async (accountId: string) =>
        accountId === SOURCE_ACCOUNT_ID
          ? createAccount()
          : createAccount({
              id: DESTINATION_ACCOUNT_ID,
              currency: 'INR',
              status: AccountStatus.ARCHIVED,
            }),
      );

      await expect(service.create(createInput)).rejects.toBeInstanceOf(
        InvalidTransactionException,
      );

      expect(transactionsRepository.createTransferLegs).not.toHaveBeenCalled();
    });

    it('propagates account lookup failures without writing', async () => {
      const notFound = new Error('Account not found');
      accountsService.findById.mockRejectedValue(notFound);

      await expect(service.create(createInput)).rejects.toBe(notFound);

      expect(transactionsRepository.createTransferLegs).not.toHaveBeenCalled();
    });

    it('uses a same-currency identity rate of 1 without changing the amount', async () => {
      accountsService.findById.mockImplementation(async (accountId: string) =>
        createAccount({
          id: accountId,
          currency: 'MYR',
        }),
      );
      exchangeRateService.getRate.mockResolvedValue({
        rate: 1,
        rateDate: TRANSFER_DATE,
        source: 'IDENTITY',
      });

      await service.create(createInput);

      expect(exchangeRateService.getRate).toHaveBeenCalledWith({
        fromCurrency: 'MYR',
        toCurrency: 'MYR',
        rateDate: TRANSFER_DATE,
      });
      expect(transactionsRepository.createTransferLegs).toHaveBeenCalledWith([
        expect.objectContaining({
          accountId: SOURCE_ACCOUNT_ID,
          type: TransactionType.TRANSFER_OUT,
          amount: '50.00',
          currency: 'MYR',
          transferExchangeRate: '1.00000000',
          transferRateSource: 'IDENTITY',
        }),
        expect.objectContaining({
          accountId: DESTINATION_ACCOUNT_ID,
          type: TransactionType.TRANSFER_IN,
          amount: '50.00',
          currency: 'MYR',
          transferExchangeRate: '1.00000000',
          transferRateSource: 'IDENTITY',
        }),
      ]);
    });

    it('converts the destination amount with the stored rate for the transfer date', async () => {
      await service.create(createInput);

      expect(exchangeRateService.getRate).toHaveBeenCalledWith({
        fromCurrency: 'MYR',
        toCurrency: 'INR',
        rateDate: TRANSFER_DATE,
      });
      expect(transactionsRepository.createTransferLegs).toHaveBeenCalledWith([
        expect.objectContaining({
          type: TransactionType.TRANSFER_OUT,
          accountId: SOURCE_ACCOUNT_ID,
          amount: '50.00',
          currency: 'MYR',
          transferExchangeRate: '20.00000000',
          transferRateSource: 'PROVIDER',
        }),
        expect.objectContaining({
          type: TransactionType.TRANSFER_IN,
          accountId: DESTINATION_ACCOUNT_ID,
          amount: '1000.0000',
          currency: 'INR',
          transferExchangeRate: '20.00000000',
          transferRateSource: 'PROVIDER',
        }),
      ]);
    });

    it('rounds the destination amount half-up to 4 decimal places', async () => {
      exchangeRateService.getRate.mockResolvedValue({
        rate: 1.23455,
        rateDate: TRANSFER_DATE,
        source: 'PROVIDER',
      });

      await service.create({ ...createInput, amount: '1.0000' });

      expect(transactionsRepository.createTransferLegs).toHaveBeenCalledWith([
        expect.objectContaining({ amount: '1.0000' }),
        expect.objectContaining({
          amount: '1.2346',
          transferExchangeRate: '1.23455000',
        }),
      ]);
    });

    it('converts each leg into the base currency with its own amount and currency', async () => {
      await service.create(createInput);

      expect(exchangeRateService.convertToBaseCurrency).toHaveBeenNthCalledWith(
        1,
        {
          amount: '50.00',
          fromCurrency: 'MYR',
          rateDate: TRANSFER_DATE,
        },
      );
      expect(exchangeRateService.convertToBaseCurrency).toHaveBeenNthCalledWith(
        2,
        {
          amount: '1000.0000',
          fromCurrency: 'INR',
          rateDate: TRANSFER_DATE,
        },
      );
    });

    it('writes both legs in one call sharing a new v4 transfer group id', async () => {
      await service.create(createInput);

      expect(transactionsRepository.createTransferLegs).toHaveBeenCalledTimes(
        1,
      );

      const [[[outInput, inInput]]] =
        transactionsRepository.createTransferLegs.mock.calls;

      expect(outInput.transferGroupId).toMatch(UUID_V4_PATTERN);
      expect(inInput.transferGroupId).toBe(outInput.transferGroupId);
      expect(outInput.transferGroupId).not.toBe(ORIGINAL_GROUP_ID);
      expect(outInput.reversalOfTransactionId).toBeNull();
      expect(inInput.reversalOfTransactionId).toBeNull();
    });

    it('stores a null description when the description is blank', async () => {
      await service.create({ ...createInput, description: '   ' });

      expect(transactionsRepository.createTransferLegs).toHaveBeenCalledWith([
        expect.objectContaining({ description: null }),
        expect.objectContaining({ description: null }),
      ]);
    });

    it('propagates an unavailable exchange rate and writes nothing', async () => {
      exchangeRateService.getRate.mockRejectedValue(
        new ExchangeRateUnavailableException(),
      );

      await expect(service.create(createInput)).rejects.toBeInstanceOf(
        ExchangeRateUnavailableException,
      );

      expect(transactionsRepository.createTransferLegs).not.toHaveBeenCalled();
    });

    it('returns the transfer pair with OUT and IN legs', async () => {
      const result = await service.create(createInput);

      expect(result.transferGroupId).toMatch(UUID_V4_PATTERN);
      expect(result.outLeg.id).toBe('created-out');
      expect(result.outLeg.type).toBe(TransactionType.TRANSFER_OUT);
      expect(result.inLeg.id).toBe('created-in');
      expect(result.inLeg.type).toBe(TransactionType.TRANSFER_IN);
      expect(result.outLeg.transferGroupId).toBe(result.transferGroupId);
      expect(result.inLeg.transferGroupId).toBe(result.transferGroupId);
    });
  });

  describe('reverse', () => {
    const reverseInput = {
      userId: USER_ID,
      transactionId: 'out-leg',
      transactionDate: '2026-09-02',
      description: 'Undo transfer',
    };

    beforeEach(() => {
      transactionsRepository.findByIdForUser.mockImplementation(
        async (transactionId: string) =>
          transactionId === 'in-leg' ? inLeg : outLeg,
      );
      transactionsRepository.findTransferLegsByGroupForUser.mockResolvedValue([
        outLeg,
        inLeg,
      ]);
      transactionsRepository.createTransferLegs.mockImplementation(
        async ([outInput, inInput]: Array<Record<string, unknown>>) => [
          createLeg({
            id: 'reversal-out',
            accountId: DESTINATION_ACCOUNT_ID,
            currency: 'INR',
            amount: '1000.0000',
            transferGroupId: outInput.transferGroupId as string,
          }),
          createLeg({
            id: 'reversal-in',
            transferGroupId: inInput.transferGroupId as string,
          }),
        ],
      );
    });

    it('rejects an invalid transaction date', async () => {
      await expect(
        service.reverse({ ...reverseInput, transactionDate: '2026-13-01' }),
      ).rejects.toBeInstanceOf(InvalidTransactionException);

      expect(transactionsRepository.createTransferLegs).not.toHaveBeenCalled();
    });

    it('throws not found when the transaction does not belong to the user', async () => {
      transactionsRepository.findByIdForUser.mockResolvedValue(null);

      await expect(service.reverse(reverseInput)).rejects.toBeInstanceOf(
        TransactionNotFoundException,
      );

      expect(transactionsRepository.createTransferLegs).not.toHaveBeenCalled();
    });

    it('rejects a non-transfer transaction', async () => {
      transactionsRepository.findByIdForUser.mockResolvedValue(
        createLeg({
          id: 'income-1',
          type: TransactionType.INCOME,
          transferGroupId: null,
          transferExchangeRate: null,
          transferRateSource: null,
        }),
      );

      await expect(service.reverse(reverseInput)).rejects.toBeInstanceOf(
        TransactionCannotBeReversedException,
      );

      expect(transactionsRepository.createTransferLegs).not.toHaveBeenCalled();
    });

    it('rejects a reversal row being reversed again', async () => {
      transactionsRepository.findByIdForUser.mockResolvedValue(
        createLeg({ reversalOfTransactionId: 'some-original' }),
      );

      await expect(service.reverse(reverseInput)).rejects.toBeInstanceOf(
        InvalidTransactionException,
      );

      expect(transactionsRepository.createTransferLegs).not.toHaveBeenCalled();
    });

    it('rejects an incomplete pair', async () => {
      transactionsRepository.findTransferLegsByGroupForUser.mockResolvedValue([
        outLeg,
      ]);

      await expect(service.reverse(reverseInput)).rejects.toBeInstanceOf(
        TransactionCannotBeReversedException,
      );

      expect(transactionsRepository.createTransferLegs).not.toHaveBeenCalled();
    });

    it('looks up the pair by the original transfer group and user', async () => {
      await service.reverse(reverseInput);

      expect(
        transactionsRepository.findTransferLegsByGroupForUser,
      ).toHaveBeenCalledWith(ORIGINAL_GROUP_ID, USER_ID);
    });

    it('rejects when the OUT leg was already reversed', async () => {
      transactionsRepository.findReversalForTransaction.mockImplementation(
        async (transactionId: string) =>
          transactionId === 'out-leg' ? createLeg({ id: 'r1' }) : null,
      );

      await expect(service.reverse(reverseInput)).rejects.toBeInstanceOf(
        InvalidTransactionException,
      );

      expect(transactionsRepository.createTransferLegs).not.toHaveBeenCalled();
    });

    it('rejects when only the IN leg was already reversed', async () => {
      transactionsRepository.findReversalForTransaction.mockImplementation(
        async (transactionId: string) =>
          transactionId === 'in-leg' ? createLeg({ id: 'r2' }) : null,
      );

      await expect(service.reverse(reverseInput)).rejects.toBeInstanceOf(
        InvalidTransactionException,
      );

      expect(transactionsRepository.createTransferLegs).not.toHaveBeenCalled();
    });

    it('writes the reversal pair as one call with a new group id and original links', async () => {
      await service.reverse(reverseInput);

      expect(transactionsRepository.createTransferLegs).toHaveBeenCalledTimes(
        1,
      );

      const [[[reversalOutInput, reversalInInput]]] =
        transactionsRepository.createTransferLegs.mock.calls;

      expect(reversalOutInput).toEqual(
        expect.objectContaining({
          accountId: DESTINATION_ACCOUNT_ID,
          type: TransactionType.TRANSFER_OUT,
          amount: '1000.0000',
          currency: 'INR',
          reversalOfTransactionId: 'in-leg',
          transactionDate: '2026-09-02',
          description: 'Undo transfer',
          transferExchangeRate: '20.00000000',
          transferRateSource: 'PROVIDER',
        }),
      );
      expect(reversalInInput).toEqual(
        expect.objectContaining({
          accountId: SOURCE_ACCOUNT_ID,
          type: TransactionType.TRANSFER_IN,
          amount: '50.0000',
          currency: 'MYR',
          reversalOfTransactionId: 'out-leg',
          transactionDate: '2026-09-02',
          transferExchangeRate: '20.00000000',
          transferRateSource: 'PROVIDER',
        }),
      );
      expect(reversalOutInput.transferGroupId).toMatch(UUID_V4_PATTERN);
      expect(reversalOutInput.transferGroupId).toBe(
        reversalInInput.transferGroupId,
      );
      expect(reversalOutInput.transferGroupId).not.toBe(ORIGINAL_GROUP_ID);
    });

    it('returns the reversal pair', async () => {
      const result = await service.reverse(reverseInput);

      expect(result.outLeg.id).toBe('reversal-out');
      expect(result.inLeg.id).toBe('reversal-in');
      expect(result.transferGroupId).toMatch(UUID_V4_PATTERN);
    });

    it('reverses the same pair when started from the IN leg', async () => {
      const fromIn = await service.reverse({
        ...reverseInput,
        transactionId: 'in-leg',
      });

      expect(
        transactionsRepository.findTransferLegsByGroupForUser,
      ).toHaveBeenCalledWith(ORIGINAL_GROUP_ID, USER_ID);
      expect(fromIn.outLeg.id).toBe('reversal-out');
      expect(fromIn.inLeg.id).toBe('reversal-in');
    });
  });
});
