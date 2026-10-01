import { Injectable } from '@nestjs/common';
import { AccountStatus } from '../../../accounts/domain/entities/account.entity';
import { AccountsService } from '../../../accounts/application/services/accounts.service';

import { Transaction } from '../../domain/entities/transaction.entity';

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

import { InvalidTransactionException } from '../../exceptions/invalid-transaction.exception';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionRepository,
    private readonly accountsService: AccountsService,
  ) {}

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const currency = input.currency.trim().toUpperCase();
    const amount = input.amount.trim();
    const description = input.description?.trim() || null;

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

    return this.transactionsRepository.create({
      accountId: account.id,
      type: input.type,
      amount,
      currency,
      description,
      transactionDate: input.transactionDate,
    });
  }
}
