import { Injectable } from '@nestjs/common';

import {
  isAccountType,
  isValidCurrencyCode,
  isValidOpeningBalance,
  ACCOUNT_NAME_MAX_LENGTH,
} from '../../domain/account-validation';
import { Account } from '../../domain/entities/account.entity';
import { AccountRepository } from '../../domain/repositories/account.repository';
import { InvalidAccountException } from '../../exceptions/invalid-account.exception';
import { AccountNotFoundException } from '../../exceptions/account-not-found.exception';
import { CreateAccountInput } from '../inputs/create-account.input';
import { PaginatedAccountsOutput } from '../outputs/paginated-accounts.output';

@Injectable()
export class AccountsService {
  constructor(private readonly accountRepository: AccountRepository) {}

  async create(input: CreateAccountInput): Promise<Account> {
    const name = input.name.trim();
    const currency = input.currency.trim().toUpperCase();
    const openingBalance = input.openingBalance.trim();

    this.validateAccountName(name);
    this.validateAccountType(input.type);
    this.validateCurrency(currency);
    this.validateOpeningBalance(openingBalance);

    return this.accountRepository.create({
      userId: input.userId,
      name,
      type: input.type,
      currency,
      openingBalance,
    });
  }

  async findById(accountId: string, userId: string): Promise<Account> {
    const account = await this.accountRepository.findByIdForUser(
      accountId,
      userId,
    );

    if (!account) {
      throw new AccountNotFoundException();
    }

    return account;
  }

  async findAll(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedAccountsOutput> {
    const skip = (page - 1) * limit;

    const result = await this.accountRepository.findAllByUserId({
      userId,
      skip,
      take: limit,
    });

    return {
      items: result.accounts,
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  private validateAccountName(name: string): void {
    if (!name) {
      throw new InvalidAccountException('Account name is required');
    }

    if (name.length > ACCOUNT_NAME_MAX_LENGTH) {
      throw new InvalidAccountException(
        `Account name must not exceed ${ACCOUNT_NAME_MAX_LENGTH} characters`,
      );
    }
  }

  private validateAccountType(type: string): void {
    if (!isAccountType(type)) {
      throw new InvalidAccountException('Invalid account type');
    }
  }

  private validateCurrency(currency: string): void {
    if (!isValidCurrencyCode(currency)) {
      throw new InvalidAccountException(
        'Currency must be a valid 3-letter uppercase code',
      );
    }
  }

  private validateOpeningBalance(balance: string): void {
    if (!isValidOpeningBalance(balance)) {
      throw new InvalidAccountException(
        'Opening balance must be a valid decimal with up to 4 decimal places',
      );
    }
  }
}
