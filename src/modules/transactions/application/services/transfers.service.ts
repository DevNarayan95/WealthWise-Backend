import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { AccountStatus } from '../../../accounts/domain/entities/account.entity';
import { AccountsService } from '../../../accounts/application/services/accounts.service';
import { ExchangeRateService } from '../../../fx/application/services/exchange-rate.service';

import {
  Transaction,
  TransactionType,
} from '../../domain/entities/transaction.entity';
import {
  CreateTransactionRepositoryInput,
  TransactionRepository,
} from '../../domain/repositories/transaction.repository';
import {
  isTransferTransactionType,
  isValidTransactionAmount,
  isValidTransactionDate,
  isValidTransactionDescription,
  TRANSACTION_AMOUNT_MAX_DECIMAL_PLACES,
  TRANSACTION_AMOUNT_MAX_INTEGER_DIGITS,
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
} from '../../domain/validation/transaction-validation';

import { CreateTransferInput } from '../inputs/create-transfer.input';
import { ReverseTransferInput } from '../inputs/reverse-transfer.input';
import { TransferPair } from '../outputs/transfer-pair.output';

import { InvalidTransactionException } from '../../presentation/exceptions/invalid-transaction.exception';
import { TransactionCannotBeReversedException } from '../../presentation/exceptions/transaction-cannot-be-reversed.exception';
import { TransactionNotFoundException } from '../../presentation/exceptions/transaction-not-found.exception';

const DESTINATION_AMOUNT_DECIMAL_PLACES = 4;
const RATE_DECIMAL_PLACES = 8;

@Injectable()
export class TransfersService {
  constructor(
    private readonly transactionsRepository: TransactionRepository,
    private readonly accountsService: AccountsService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  async create(input: CreateTransferInput): Promise<TransferPair> {
    const amount = input.amount.trim();
    const description = input.description?.trim() || null;

    if (!isValidTransactionAmount(amount)) {
      throw new InvalidTransactionException(
        `Amount must be a positive decimal with up to ${TRANSACTION_AMOUNT_MAX_INTEGER_DIGITS} integer digits and ${TRANSACTION_AMOUNT_MAX_DECIMAL_PLACES} decimal places`,
      );
    }

    if (!isValidTransactionDescription(description)) {
      throw new InvalidTransactionException(
        `Description must not exceed ${TRANSACTION_DESCRIPTION_MAX_LENGTH} characters`,
      );
    }

    if (!isValidTransactionDate(input.transactionDate)) {
      throw new InvalidTransactionException('Transaction date must be valid');
    }

    if (input.sourceAccountId === input.destinationAccountId) {
      throw new InvalidTransactionException(
        'Source and destination accounts must be different',
      );
    }

    const sourceAccount = await this.accountsService.findById(
      input.sourceAccountId,
      input.userId,
    );
    const destinationAccount = await this.accountsService.findById(
      input.destinationAccountId,
      input.userId,
    );

    if (
      sourceAccount.status !== AccountStatus.ACTIVE ||
      destinationAccount.status !== AccountStatus.ACTIVE
    ) {
      throw new InvalidTransactionException(
        'Transfers can only be made between active accounts',
      );
    }

    const sourceCurrency = sourceAccount.currency;
    const destinationCurrency = destinationAccount.currency;
    const rateDate = input.transactionDate;

    const rate = await this.exchangeRateService.getRate({
      fromCurrency: sourceCurrency,
      toCurrency: destinationCurrency,
      rateDate,
    });

    const isSameCurrency = sourceCurrency === destinationCurrency;
    const destinationAmount = isSameCurrency
      ? amount
      : new Prisma.Decimal(amount)
          .mul(rate.rate)
          .toDecimalPlaces(DESTINATION_AMOUNT_DECIMAL_PLACES)
          .toFixed(DESTINATION_AMOUNT_DECIMAL_PLACES);
    const transferExchangeRate = new Prisma.Decimal(rate.rate).toFixed(
      RATE_DECIMAL_PLACES,
    );

    const sourceBase = await this.exchangeRateService.convertToBaseCurrency({
      amount,
      fromCurrency: sourceCurrency,
      rateDate,
    });
    const destinationBase =
      await this.exchangeRateService.convertToBaseCurrency({
        amount: destinationAmount,
        fromCurrency: destinationCurrency,
        rateDate,
      });

    const transferGroupId = randomUUID();

    const [outLeg, inLeg] =
      await this.transactionsRepository.createTransferLegs([
        {
          accountId: input.sourceAccountId,
          type: TransactionType.TRANSFER_OUT,
          amount,
          currency: sourceCurrency,
          description,
          transactionDate: input.transactionDate,
          reversalOfTransactionId: null,
          incomeCategoryId: null,
          expenseCategoryId: null,
          baseCurrency: sourceBase.baseCurrency,
          baseAmount: sourceBase.baseAmount,
          exchangeRate: sourceBase.exchangeRate,
          rateDate: sourceBase.rateDate,
          rateSource: sourceBase.rateSource,
          transferGroupId,
          transferExchangeRate,
          transferRateSource: rate.source,
        },
        {
          accountId: input.destinationAccountId,
          type: TransactionType.TRANSFER_IN,
          amount: destinationAmount,
          currency: destinationCurrency,
          description,
          transactionDate: input.transactionDate,
          reversalOfTransactionId: null,
          incomeCategoryId: null,
          expenseCategoryId: null,
          baseCurrency: destinationBase.baseCurrency,
          baseAmount: destinationBase.baseAmount,
          exchangeRate: destinationBase.exchangeRate,
          rateDate: destinationBase.rateDate,
          rateSource: destinationBase.rateSource,
          transferGroupId,
          transferExchangeRate,
          transferRateSource: rate.source,
        },
      ]);

    return { transferGroupId, outLeg, inLeg };
  }

  async reverse(input: ReverseTransferInput): Promise<TransferPair> {
    const description = input.description?.trim() || null;

    if (!isValidTransactionDescription(description)) {
      throw new InvalidTransactionException(
        `Description must not exceed ${TRANSACTION_DESCRIPTION_MAX_LENGTH} characters`,
      );
    }

    if (!isValidTransactionDate(input.transactionDate)) {
      throw new InvalidTransactionException('Transaction date must be valid');
    }

    const transaction = await this.transactionsRepository.findByIdForUser(
      input.transactionId,
      input.userId,
    );

    if (!transaction) {
      throw new TransactionNotFoundException('Transaction not found');
    }

    if (
      !isTransferTransactionType(transaction.type) ||
      transaction.transferGroupId === null
    ) {
      throw new TransactionCannotBeReversedException(
        'Only transfer legs can be reversed through the transfers endpoint',
      );
    }

    if (transaction.reversalOfTransactionId !== null) {
      throw new InvalidTransactionException(
        'A reversal transaction cannot be reversed',
      );
    }

    const legs =
      await this.transactionsRepository.findTransferLegsByGroupForUser(
        transaction.transferGroupId,
        input.userId,
      );
    const outLeg = legs.find(
      (leg) => leg.type === TransactionType.TRANSFER_OUT,
    );
    const inLeg = legs.find((leg) => leg.type === TransactionType.TRANSFER_IN);

    if (!outLeg || !inLeg) {
      throw new TransactionCannotBeReversedException(
        'Transfer pair is incomplete and cannot be reversed',
      );
    }

    const existingReversals = await Promise.all(
      [outLeg, inLeg].map((leg) =>
        this.transactionsRepository.findReversalForTransaction(
          leg.id,
          input.userId,
        ),
      ),
    );

    if (existingReversals.some((reversal) => reversal !== null)) {
      throw new InvalidTransactionException(
        'Transfer has already been reversed',
      );
    }

    const transferGroupId = randomUUID();

    const [reversalOutLeg, reversalInLeg] =
      await this.transactionsRepository.createTransferLegs([
        this.buildReversalLeg({
          original: inLeg,
          type: TransactionType.TRANSFER_OUT,
          transactionDate: input.transactionDate,
          description,
          transferGroupId,
        }),
        this.buildReversalLeg({
          original: outLeg,
          type: TransactionType.TRANSFER_IN,
          transactionDate: input.transactionDate,
          description,
          transferGroupId,
        }),
      ]);

    return {
      transferGroupId,
      outLeg: reversalOutLeg,
      inLeg: reversalInLeg,
    };
  }

  /**
   * Mirrors the original leg on the same account so the balance nets to zero.
   * The reversal of an IN leg is an OUT on the destination and vice versa.
   */
  private buildReversalLeg(params: {
    original: Transaction;
    type: TransactionType;
    transactionDate: string;
    description: string | null;
    transferGroupId: string;
  }): CreateTransactionRepositoryInput {
    const { original } = params;

    return {
      accountId: original.accountId,
      type: params.type,
      amount: original.amount,
      currency: original.currency,
      description: params.description,
      transactionDate: params.transactionDate,
      reversalOfTransactionId: original.id,
      incomeCategoryId: null,
      expenseCategoryId: null,
      baseCurrency: original.baseCurrency,
      baseAmount: original.baseAmount,
      exchangeRate: original.exchangeRate,
      rateDate: original.rateDate,
      rateSource: original.rateSource,
      transferGroupId: params.transferGroupId,
      transferExchangeRate: original.transferExchangeRate,
      transferRateSource: original.transferRateSource,
    };
  }
}
