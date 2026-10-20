import { Injectable } from '@nestjs/common';
import { AccountStatus } from '../../../accounts/domain/entities/account.entity';
import { AccountsService } from '../../../accounts/application/services/accounts.service';
import { IncomeCategoriesService } from '../../../income/application/services/income-categories.service';

import {
  Transaction,
  TransactionType,
} from '../../domain/entities/transaction.entity';

import {
  isTransactionType,
  isValidTransactionAmount,
  isValidTransactionCurrency,
  isValidTransactionDate,
  isValidTransactionDescription,
  TRANSACTION_AMOUNT_MAX_DECIMAL_PLACES,
  TRANSACTION_AMOUNT_MAX_INTEGER_DIGITS,
  TRANSACTION_CURRENCY_LENGTH,
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
} from '../../domain/validation/transaction-validation';

import { TransactionRepository } from '../../domain/repositories/transaction.repository';

import { CreateTransactionInput } from '../inputs/create-transaction.input';

import { InvalidTransactionException } from '../../presentation/exceptions/invalid-transaction.exception';
import { TransactionNotFoundException } from '../../presentation/exceptions/transaction-not-found.exception';
import { ListTransactionsInput } from '../inputs/list-transactions.input';
import { ReverseTransactionInput } from '../inputs/reverse-transaction.input';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionRepository,
    private readonly accountsService: AccountsService,
    private readonly incomeCategoriesService: IncomeCategoriesService,
  ) {}

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const currency = input.currency.trim().toUpperCase();
    const amount = input.amount.trim();
    const description = input.description?.trim() || null;
    const incomeCategoryId = input.incomeCategoryId ?? null;

    if (!isTransactionType(input.type)) {
      throw new InvalidTransactionException('Invalid transaction type');
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

    return this.transactionsRepository.create({
      accountId: account.id,
      type: input.type,
      amount,
      currency,
      description,
      transactionDate: input.transactionDate,
      reversalOfTransactionId: null,
      incomeCategoryId,
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
    await this.accountsService.findById(input.accountId, input.userId);

    return this.transactionsRepository.findAllByAccountForUser(input);
  }
}
