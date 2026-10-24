import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

import {
  Transaction,
  TransactionRateSource,
  TransactionType,
} from '../../domain/entities/transaction.entity';

import {
  CreateTransactionRepositoryInput,
  FindTransactionsForExportRepositoryInput,
  FindTransactionsRepositoryInput,
  FindTransactionsRepositoryOutput,
  TransactionExportRecord,
  TransactionRepository,
} from '../../domain/repositories/transaction.repository';

const toDateColumnValue = (isoDate: string): Date => {
  return new Date(`${isoDate}T00:00:00.000Z`);
};

const toIsoDateString = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

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
        transactionDate: toDateColumnValue(input.transactionDate),
        reversalOfTransactionId: input.reversalOfTransactionId,
        incomeCategoryId: input.incomeCategoryId,
        expenseCategoryId: input.expenseCategoryId,
        baseCurrency: input.baseCurrency,
        baseAmount: input.baseAmount,
        exchangeRate: input.exchangeRate,
        rateDate: toDateColumnValue(input.rateDate),
        rateSource: input.rateSource,
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

  async findReversalForTransaction(
    transactionId: string,
    userId: string,
  ): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        reversalOfTransactionId: transactionId,
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
    const where = this.buildListWhere(input);

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

  async findAllForExportByUser(
    input: FindTransactionsForExportRepositoryInput,
  ): Promise<TransactionExportRecord[]> {
    const rows = await this.prisma.transaction.findMany({
      where: this.buildListWhere(input),
      take: input.take,
      orderBy: [
        {
          transactionDate: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      include: {
        account: { select: { name: true } },
        incomeCategory: { select: { name: true } },
        expenseCategory: { select: { name: true } },
      },
    });

    return rows.map((row) => ({
      transaction: this.toDomain(row),
      accountName: row.account.name,
      categoryName:
        row.incomeCategory?.name ?? row.expenseCategory?.name ?? null,
    }));
  }

  private buildListWhere(
    input: Omit<FindTransactionsRepositoryInput, 'offset' | 'limit'>,
  ) {
    const where: {
      accountId?: string;
      account: { userId: string };
      transactionDate?: { gte?: Date; lte?: Date };
      type?: TransactionType;
      incomeCategoryId?: string;
      expenseCategoryId?: string;
    } = {
      account: {
        userId: input.userId,
      },
    };

    if (input.accountId !== undefined) {
      where.accountId = input.accountId;
    }

    const dateRange: { gte?: Date; lte?: Date } = {};

    if (input.from !== undefined) {
      dateRange.gte = toDateColumnValue(input.from);
    }

    if (input.to !== undefined) {
      dateRange.lte = toDateColumnValue(input.to);
    }

    if (Object.keys(dateRange).length > 0) {
      where.transactionDate = dateRange;
    }

    if (input.type !== undefined) {
      where.type = input.type;
    }

    if (input.incomeCategoryId !== undefined) {
      where.incomeCategoryId = input.incomeCategoryId;
    }

    if (input.expenseCategoryId !== undefined) {
      where.expenseCategoryId = input.expenseCategoryId;
    }

    return where;
  }

  private toDomain(transaction: {
    id: string;
    accountId: string;
    type: string;
    amount: { toFixed(decimalPlaces: number): string };
    currency: string;
    description: string | null;
    transactionDate: Date;
    reversalOfTransactionId: string | null;
    incomeCategoryId: string | null;
    expenseCategoryId: string | null;
    baseCurrency: string;
    baseAmount: { toFixed(decimalPlaces: number): string };
    exchangeRate: { toFixed(decimalPlaces: number): string };
    rateDate: Date;
    rateSource: string;
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
      transactionDate: toIsoDateString(transaction.transactionDate),
      reversalOfTransactionId: transaction.reversalOfTransactionId,
      incomeCategoryId: transaction.incomeCategoryId,
      expenseCategoryId: transaction.expenseCategoryId,
      baseCurrency: transaction.baseCurrency.trim(),
      baseAmount: transaction.baseAmount.toFixed(4),
      exchangeRate: transaction.exchangeRate.toFixed(8),
      rateDate: toIsoDateString(transaction.rateDate),
      rateSource: this.toDomainRateSource(transaction.rateSource),
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    });
  }

  private toDomainRateSource(source: string): TransactionRateSource {
    switch (source) {
      case 'IDENTITY':
      case 'PROVIDER':
      case 'FALLBACK':
      case 'MANUAL':
        return source;

      default:
        throw new Error(`Unsupported rate source: ${source}`);
    }
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
