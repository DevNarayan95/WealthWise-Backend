import { Injectable } from '@nestjs/common';
import { AccountStatus } from '../../../accounts/domain/entities/account.entity';
import { AccountsService } from '../../../accounts/application/services/accounts.service';
import { ExchangeRateService } from '../../../fx/application/services/exchange-rate.service';
import { ExpenseCategoriesService } from '../../../expenses/application/services/expense-categories.service';
import { IncomeCategoriesService } from '../../../income/application/services/income-categories.service';

import {
  Transaction,
  TransactionType,
} from '../../domain/entities/transaction.entity';

import {
  isTransactionType,
  isTransferTransactionType,
  isValidTransactionAmount,
  isValidTransactionCurrency,
  isValidTransactionDate,
  isValidTransactionDescription,
  TRANSACTION_AMOUNT_MAX_DECIMAL_PLACES,
  TRANSACTION_AMOUNT_MAX_INTEGER_DIGITS,
  TRANSACTION_CURRENCY_LENGTH,
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
} from '../../domain/validation/transaction-validation';

import {
  TransactionExportRecord,
  TransactionRepository,
} from '../../domain/repositories/transaction.repository';

import { CreateTransactionInput } from '../inputs/create-transaction.input';
import type { ExportTransactionsInput } from '../inputs/export-transactions.input';
import {
  assertWithinExportLimit,
  getExportRowLimit,
} from '../../../../common/export/export-limit';

import { InvalidTransactionException } from '../../presentation/exceptions/invalid-transaction.exception';
import { TransactionCannotBeReversedException } from '../../presentation/exceptions/transaction-cannot-be-reversed.exception';
import { TransactionNotFoundException } from '../../presentation/exceptions/transaction-not-found.exception';
import { ListTransactionsInput } from '../inputs/list-transactions.input';
import { ReverseTransactionInput } from '../inputs/reverse-transaction.input';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionRepository,
    private readonly accountsService: AccountsService,
    private readonly incomeCategoriesService: IncomeCategoriesService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const currency = input.currency.trim().toUpperCase();
    const amount = input.amount.trim();
    const description = input.description?.trim() || null;
    const incomeCategoryId = input.incomeCategoryId ?? null;
    const expenseCategoryId = input.expenseCategoryId ?? null;

    if (!isTransactionType(input.type)) {
      throw new InvalidTransactionException('Invalid transaction type');
    }

    if (isTransferTransactionType(input.type)) {
      throw new InvalidTransactionException(
        'Transfer transactions must be created through the transfers endpoint',
      );
    }

    if (!isValidTransactionAmount(amount)) {
      throw new InvalidTransactionException(
        `Amount must be a positive decimal with up to ${TRANSACTION_AMOUNT_MAX_INTEGER_DIGITS} integer digits and ${TRANSACTION_AMOUNT_MAX_DECIMAL_PLACES} decimal places`,
      );
    }

    if (
      currency.length !== TRANSACTION_CURRENCY_LENGTH ||
      !isValidTransactionCurrency(currency)
    ) {
      throw new InvalidTransactionException(
        'Currency must be a valid 3-letter ISO currency code',
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

    if (incomeCategoryId !== null && input.type !== TransactionType.INCOME) {
      throw new InvalidTransactionException(
        'Income category can only be set on income transactions',
      );
    }

    if (expenseCategoryId !== null && input.type !== TransactionType.EXPENSE) {
      throw new InvalidTransactionException(
        'Expense category can only be set on expense transactions',
      );
    }

    const account = await this.accountsService.findById(
      input.accountId,
      input.userId,
    );

    if (account.status !== AccountStatus.ACTIVE) {
      throw new InvalidTransactionException(
        'Transactions can only be created for active accounts',
      );
    }

    if (currency !== account.currency) {
      throw new InvalidTransactionException(
        'Transaction currency must match account currency',
      );
    }

    if (incomeCategoryId !== null) {
      await this.incomeCategoriesService.findById(
        incomeCategoryId,
        input.userId,
      );
    }

    if (expenseCategoryId !== null) {
      await this.expenseCategoriesService.findById(
        expenseCategoryId,
        input.userId,
      );
    }

    const baseConversion = await this.exchangeRateService.convertToBaseCurrency(
      {
        amount,
        fromCurrency: currency,
        rateDate: input.transactionDate,
      },
    );

    return this.transactionsRepository.create({
      accountId: account.id,
      type: input.type,
      amount,
      currency,
      description,
      transactionDate: input.transactionDate,
      reversalOfTransactionId: null,
      incomeCategoryId,
      expenseCategoryId,
      baseCurrency: baseConversion.baseCurrency,
      baseAmount: baseConversion.baseAmount,
      exchangeRate: baseConversion.exchangeRate,
      rateDate: baseConversion.rateDate,
      rateSource: baseConversion.rateSource,
    });
  }

  async reverse(input: ReverseTransactionInput): Promise<Transaction> {
    const description = input.description?.trim() || null;

    if (!isValidTransactionDescription(description)) {
      throw new InvalidTransactionException(
        `Description must be not exceed ${TRANSACTION_DESCRIPTION_MAX_LENGTH} characters`,
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

    if (isTransferTransactionType(transaction.type)) {
      throw new TransactionCannotBeReversedException(
        'Transfer legs must be reversed as a pair through the transfers endpoint',
      );
    }

    if (transaction.reversalOfTransactionId !== null) {
      throw new InvalidTransactionException(
        'A reversal transaction cannot be reversed',
      );
    }

    const existingReversal =
      await this.transactionsRepository.findReversalForTransaction(
        transaction.id,
        input.userId,
      );

    if (existingReversal) {
      throw new InvalidTransactionException(
        'Transaction has already been reversed',
      );
    }

    const reversalType =
      transaction.type === TransactionType.INCOME
        ? TransactionType.EXPENSE
        : TransactionType.INCOME;

    return this.transactionsRepository.create({
      accountId: transaction.accountId,
      type: reversalType,
      amount: transaction.amount,
      currency: transaction.currency,
      description,
      transactionDate: input.transactionDate,
      reversalOfTransactionId: transaction.id,
      incomeCategoryId: null,
      expenseCategoryId: null,
      baseCurrency: transaction.baseCurrency,
      baseAmount: transaction.baseAmount,
      exchangeRate: transaction.exchangeRate,
      rateDate: transaction.rateDate,
      rateSource: transaction.rateSource,
    });
  }

  async findById(transactionId: string, userId: string): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findByIdForUser(
      transactionId,
      userId,
    );

    if (!transaction) {
      throw new TransactionNotFoundException('Transaction not found');
    }

    return transaction;
  }

  async findAll(input: ListTransactionsInput): Promise<{
    transactions: Transaction[];
    total: number;
  }> {
    this.assertValidDateRange(input.from, input.to);

    if (input.accountId !== undefined) {
      await this.accountsService.findById(input.accountId, input.userId);
    }

    return this.transactionsRepository.findAllByAccountForUser(input);
  }

  async findAllForExport(
    input: ExportTransactionsInput,
  ): Promise<TransactionExportRecord[]> {
    this.assertValidDateRange(input.from, input.to);

    if (input.accountId !== undefined) {
      await this.accountsService.findById(input.accountId, input.userId);
    }

    const records = await this.transactionsRepository.findAllForExportByUser({
      userId: input.userId,
      accountId: input.accountId,
      from: input.from,
      to: input.to,
      type: input.type,
      incomeCategoryId: input.incomeCategoryId,
      expenseCategoryId: input.expenseCategoryId,
      take: getExportRowLimit() + 1,
    });

    assertWithinExportLimit(records.length);

    return records;
  }

  private assertValidDateRange(from?: string, to?: string): void {
    if (from !== undefined && !isValidTransactionDate(from)) {
      throw new InvalidTransactionException('From date must be a valid date');
    }

    if (to !== undefined && !isValidTransactionDate(to)) {
      throw new InvalidTransactionException('To date must be a valid date');
    }

    if (from !== undefined && to !== undefined && from > to) {
      throw new InvalidTransactionException(
        'From date must not be after to date',
      );
    }
  }
}
