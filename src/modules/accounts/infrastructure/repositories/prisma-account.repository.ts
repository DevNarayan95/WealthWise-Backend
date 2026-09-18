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
} from '../../domain/repositories/account.repository';

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
