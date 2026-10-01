import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

import {
  Transaction,
  TransactionType,
} from '../../domain/entities/transaction.entity';

import {
  CreateTransactionRepositoryInput,
  FindTransactionsRepositoryInput,
  FindTransactionsRepositoryOutput,
  TransactionRepository,
} from '../../domain/repositories/transaction.repository';

@Injectable()
export class PrismaTransactionRepository extends TransactionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateTransactionRepositoryInput): Promise<Transaction> {
    const transaction = await this.prisma.transaction.create({
      data: {
        accountId: input.accountId,
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        transactionDate: input.transactionDate,
      },
    });

    return this.toDomain(transaction);
  }

  async findByIdForUser(
    transactionId: string,
    userId: string,
  ): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        account: {
          userId,
        },
      },
    });

    return transaction ? this.toDomain(transaction) : null;
  }

  async findAllByAccountForUser(
    input: FindTransactionsRepositoryInput,
  ): Promise<FindTransactionsRepositoryOutput> {
    const where = {
      accountId: input.accountId,
      account: {
        userId: input.userId,
      },
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: input.offset,
        take: input.limit,
        orderBy: [
          {
            transactionDate: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
      }),
      this.prisma.transaction.count({
        where,
      }),
    ]);

    return {
      transactions: transactions.map((transaction) =>
        this.toDomain(transaction),
      ),
      total,
    };
  }

  private toDomain(transaction: {
    id: string;
    accountId: string;
    type: string;
    amount: { toFixed(decimalPlaces: number): string };
    currency: string;
    description: string | null;
    transactionDate: Date;
    createdAt: Date;
    updatedAt: Date;
  }): Transaction {
    return Transaction.create({
      id: transaction.id,
      accountId: transaction.accountId,
      type: this.toDomainTransactionType(transaction.type),
      amount: transaction.amount.toFixed(4),
      currency: transaction.currency.trim(),
      description: transaction.description,
      transactionDate: transaction.transactionDate,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    });
  }

  private toDomainTransactionType(type: string): TransactionType {
    switch (type) {
      case 'INCOME':
        return TransactionType.INCOME;

      case 'EXPENSE':
        return TransactionType.EXPENSE;

      default:
        throw new Error(`Unsupported transaction type: ${type}`);
    }
  }
}
