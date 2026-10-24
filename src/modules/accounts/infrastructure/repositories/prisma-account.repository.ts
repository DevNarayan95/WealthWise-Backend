import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  Account,
  AccountStatus,
  AccountType,
} from '../../domain/entities/account.entity';
import {
  AccountRepository,
  CreateAccountRepositoryInput,
  FindAccountsRepositoryInput,
  FindAccountsRepositoryOutput,
  GetAccountBalanceRepositoryInput,
  GetAccountBalanceRepositoryOutput,
  GetAccountBalancesRepositoryInput,
  UpdateAccountRepositoryInput,
} from '../../domain/repositories/account.repository';

import { Prisma } from '../../../../../prisma/generated/prisma/client';

interface BalanceTotal {
  type: string;
  amount: Prisma.Decimal | null;
}

@Injectable()
export class PrismaAccountRepository implements AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAccountRepositoryInput): Promise<Account> {
    const account = await this.prisma.account.create({
      data: {
        userId: input.userId,
        name: input.name,
        type: input.type,
        currency: input.currency,
        openingBalance: input.openingBalance,
      },
    });

    return this.toDomain(account);
  }

  async findByIdForUser(
    accountId: string,
    userId: string,
  ): Promise<Account | null> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    return account ? this.toDomain(account) : null;
  }

  async findAllByUserId(
    input: FindAccountsRepositoryInput,
  ): Promise<FindAccountsRepositoryOutput> {
    const where = {
      userId: input.userId,
    };

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.account.count({
        where,
      }),
    ]);

    return {
      accounts: accounts.map((account) => this.toDomain(account)),
      total,
    };
  }

  async update(input: UpdateAccountRepositoryInput): Promise<Account | null> {
    const result = await this.prisma.account.updateMany({
      where: {
        id: input.accountId,
        userId: input.userId,
      },
      data: {
        status: input.status,
      },
    });

    if (result.count === 0) {
      return null;
    }

    const account = await this.prisma.account.findFirst({
      where: {
        id: input.accountId,
        userId: input.userId,
      },
    });

    return account ? this.toDomain(account) : null;
  }

  async getBalanceForUser(
    input: GetAccountBalanceRepositoryInput,
  ): Promise<GetAccountBalanceRepositoryOutput | null> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: input.accountId,
        userId: input.userId,
      },
      select: {
        id: true,
        currency: true,
        openingBalance: true,
      },
    });

    if (!account) {
      return null;
    }

    const transactionWhere = {
      accountId: input.accountId,
      ...(input.asOf ? { transactionDate: { lte: input.asOf } } : {}),
    };

    const transactionTotals = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: transactionWhere,
      _sum: {
        amount: true,
      },
    });

    const balance = this.calculateBalance(
      account.openingBalance,
      transactionTotals.map((total) => ({
        type: total.type,
        amount: total._sum.amount,
      })),
    );

    return {
      accountId: account.id,
      currency: account.currency.trim(),
      balance: balance.toFixed(4),
    };
  }

  async getBalancesForAccounts(
    input: GetAccountBalancesRepositoryInput,
  ): Promise<GetAccountBalanceRepositoryOutput[]> {
    if (input.accountIds.length === 0) {
      return [];
    }

    const accounts = await this.prisma.account.findMany({
      where: {
        id: { in: input.accountIds },
        userId: input.userId,
      },
      select: {
        id: true,
        currency: true,
        openingBalance: true,
      },
    });

    if (accounts.length === 0) {
      return [];
    }

    const transactionTotals = await this.prisma.transaction.groupBy({
      by: ['accountId', 'type'],
      where: { accountId: { in: accounts.map((account) => account.id) } },
      _sum: {
        amount: true,
      },
    });

    const totalsByAccountId = new Map<string, BalanceTotal[]>();

    for (const total of transactionTotals) {
      const totals = totalsByAccountId.get(total.accountId) ?? [];

      totals.push({ type: total.type, amount: total._sum.amount });
      totalsByAccountId.set(total.accountId, totals);
    }

    return accounts.map((account) => ({
      accountId: account.id,
      currency: account.currency.trim(),
      balance: this.calculateBalance(
        account.openingBalance,
        totalsByAccountId.get(account.id) ?? [],
      ).toFixed(4),
    }));
  }

  private calculateBalance(
    openingBalance: Prisma.Decimal,
    totals: BalanceTotal[],
  ): Prisma.Decimal {
    let income = new Prisma.Decimal(0);
    let expense = new Prisma.Decimal(0);

    for (const total of totals) {
      const amount = total.amount ?? new Prisma.Decimal(0);

      if (total.type === 'INCOME') {
        income = income.plus(amount);
      }

      if (total.type === 'EXPENSE') {
        expense = expense.plus(amount);
      }
    }

    return openingBalance.plus(income).minus(expense);
  }

  private toDomain(account: {
    id: string;
    userId: string;
    name: string;
    type: string;
    currency: string;
    openingBalance: { toString(): string };
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): Account {
    return Account.create({
      id: account.id,
      userId: account.userId,
      name: account.name,
      type: this.toDomainAccountType(account.type),
      currency: account.currency.trim(),
      openingBalance: account.openingBalance.toString(),
      status: this.toDomainAccountStatus(account.status),
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    });
  }

  private toDomainAccountType(type: string): AccountType {
    switch (type) {
      case 'BANK_ACCOUNT':
        return AccountType.BANK_ACCOUNT;
      case 'CASH':
        return AccountType.CASH;
      case 'CREDIT_CARD':
        return AccountType.CREDIT_CARD;
      case 'INVESTMENT':
        return AccountType.INVESTMENT;
      case 'OTHER':
        return AccountType.OTHER;
      case 'SAVINGS':
        return AccountType.SAVINGS;
      case 'CURRENT':
        return AccountType.CURRENT;
      case 'WALLET':
        return AccountType.WALLET;
      case 'FIXED_DEPOSIT':
        return AccountType.FIXED_DEPOSIT;
      case 'RECURRING_DEPOSIT':
        return AccountType.RECURRING_DEPOSIT;
      default:
        throw new Error(`Unsupported account type: ${type}`);
    }
  }

  private toDomainAccountStatus(status: string): AccountStatus {
    switch (status) {
      case 'ACTIVE':
        return AccountStatus.ACTIVE;
      case 'ARCHIVED':
        return AccountStatus.ARCHIVED;
      default:
        throw new Error(`Unsupported account status: ${status}`);
    }
  }
}
