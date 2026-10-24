import {
  TransactionRateSource,
  TransactionType,
} from '../../domain/entities/transaction.entity';
import { PrismaTransactionRepository } from './prisma-transaction.repository';

describe('PrismaTransactionRepository', () => {
  const prisma = {
    transaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const transactionDate = new Date('2026-09-20T00:00:00.000Z');
  const createdAt = new Date('2026-09-20T10:00:00.000Z');
  const updatedAt = new Date('2026-09-20T10:00:00.000Z');

  const createPrismaTransaction = (
    overrides: Partial<{
      id: string;
      accountId: string;
      type: string;
      amount: {
        toFixed: (decimalPlaces: number) => string;
      };
      currency: string;
      description: string | null;
      transactionDate: Date;
      reversalOfTransactionId: string | null;
      incomeCategoryId: string | null;
      expenseCategoryId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }> = {},
  ) => ({
    id: 'transaction-1',
    accountId: 'account-1',
    type: 'INCOME',
    amount: {
      toFixed: () => '5000.5000',
    },
    currency: 'MYR',
    description: 'Salary',
    transactionDate,
    reversalOfTransactionId: null,
    incomeCategoryId: null,
    expenseCategoryId: null,
    baseCurrency: 'INR',
    baseAmount: {
      toFixed: () => '26252.6250',
    },
    exchangeRate: {
      toFixed: () => '5.25000000',
    },
    rateDate: transactionDate,
    rateSource: 'PROVIDER',
    createdAt,
    updatedAt,
    ...overrides,
  });

  const createTransactionInput = (
    overrides: Partial<{
      accountId: string;
      type: TransactionType;
      amount: string;
      currency: string;
      description: string | null;
      transactionDate: string;
      reversalOfTransactionId: string | null;
      incomeCategoryId: string | null;
      expenseCategoryId: string | null;
      baseCurrency: string;
      baseAmount: string;
      exchangeRate: string;
      rateDate: string;
      rateSource: TransactionRateSource;
    }> = {},
  ) => ({
    accountId: 'account-1',
    type: TransactionType.INCOME,
    amount: '5000.5000',
    currency: 'MYR',
    description: 'Salary',
    transactionDate: '2026-09-20',
    reversalOfTransactionId: null,
    incomeCategoryId: null,
    expenseCategoryId: null,
    baseCurrency: 'INR',
    baseAmount: '26252.6250',
    exchangeRate: '5.25000000',
    rateDate: '2026-09-20',
    rateSource: 'PROVIDER' as const,
    ...overrides,
  });

  const toExpectedPrismaData = (
    input: ReturnType<typeof createTransactionInput>,
  ) => ({
    ...input,
    transactionDate: new Date(`${input.transactionDate}T00:00:00.000Z`),
    rateDate: new Date(`${input.rateDate}T00:00:00.000Z`),
  });

  let repository: PrismaTransactionRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    repository = new PrismaTransactionRepository(prisma as never);
  });

  describe('create', () => {
    it('should create and map a transaction', async () => {
      prisma.transaction.create.mockResolvedValue(createPrismaTransaction());

      const result = await repository.create(createTransactionInput());

      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: toExpectedPrismaData(createTransactionInput()),
      });

      expect(result.id).toBe('transaction-1');
      expect(result.accountId).toBe('account-1');
      expect(result.type).toBe(TransactionType.INCOME);
      expect(result.amount).toBe('5000.5000');
      expect(result.currency).toBe('MYR');
      expect(result.description).toBe('Salary');
      expect(result.reversalOfTransactionId).toBeNull();
    });

    it('should persist the income category for an income transaction', async () => {
      prisma.transaction.create.mockResolvedValue(
        createPrismaTransaction({ incomeCategoryId: 'category-1' }),
      );

      const input = createTransactionInput({
        incomeCategoryId: 'category-1',
      });

      const result = await repository.create(input);

      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: toExpectedPrismaData(input),
      });
      expect(result.incomeCategoryId).toBe('category-1');
    });

    it('should create and map a reversal transaction', async () => {
      prisma.transaction.create.mockResolvedValue(
        createPrismaTransaction({
          id: 'reversal-1',
          type: 'EXPENSE',
          description: 'Reversal of salary',
          transactionDate: new Date('2026-09-21T00:00:00.000Z'),
          reversalOfTransactionId: 'transaction-1',
        }),
      );

      const input = createTransactionInput({
        type: TransactionType.EXPENSE,
        description: 'Reversal of salary',
        transactionDate: '2026-09-21',
        rateDate: '2026-09-21',
        reversalOfTransactionId: 'transaction-1',
      });

      const result = await repository.create(input);

      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: toExpectedPrismaData(input),
      });

      expect(result.id).toBe('reversal-1');
      expect(result.type).toBe(TransactionType.EXPENSE);
      expect(result.amount).toBe('5000.5000');
      expect(result.currency).toBe('MYR');
      expect(result.description).toBe('Reversal of salary');
      expect(result.reversalOfTransactionId).toBe('transaction-1');
    });
  });

  describe('findByIdForUser', () => {
    it('should return a transaction belonging to the user', async () => {
      prisma.transaction.findFirst.mockResolvedValue(
        createPrismaTransaction({
          type: 'EXPENSE',
        }),
      );

      const result = await repository.findByIdForUser(
        'transaction-1',
        'user-1',
      );

      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'transaction-1',
          account: {
            userId: 'user-1',
          },
        },
      });

      expect(result).not.toBeNull();
      expect(result?.type).toBe(TransactionType.EXPENSE);
      expect(result?.amount).toBe('5000.5000');
      expect(result?.currency).toBe('MYR');
      expect(result?.reversalOfTransactionId).toBeNull();
    });

    it('should return a reversal transaction with its original transaction id', async () => {
      prisma.transaction.findFirst.mockResolvedValue(
        createPrismaTransaction({
          id: 'reversal-1',
          type: 'EXPENSE',
          description: 'Reversal',
          reversalOfTransactionId: 'transaction-1',
        }),
      );

      const result = await repository.findByIdForUser('reversal-1', 'user-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('reversal-1');
      expect(result?.reversalOfTransactionId).toBe('transaction-1');
    });

    it('should return null when the transaction is not accessible by the user', async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      const result = await repository.findByIdForUser(
        'transaction-1',
        'user-1',
      );

      expect(result).toBeNull();

      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'transaction-1',
          account: {
            userId: 'user-1',
          },
        },
      });
    });
  });

  describe('findReversalForTransaction', () => {
    it('should return the reversal belonging to the user', async () => {
      prisma.transaction.findFirst.mockResolvedValue(
        createPrismaTransaction({
          id: 'reversal-1',
          type: 'EXPENSE',
          description: 'Reversal of salary',
          reversalOfTransactionId: 'transaction-1',
        }),
      );

      const result = await repository.findReversalForTransaction(
        'transaction-1',
        'user-1',
      );

      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: {
          reversalOfTransactionId: 'transaction-1',
          account: {
            userId: 'user-1',
          },
        },
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe('reversal-1');
      expect(result?.accountId).toBe('account-1');
      expect(result?.type).toBe(TransactionType.EXPENSE);
      expect(result?.amount).toBe('5000.5000');
      expect(result?.currency).toBe('MYR');
      expect(result?.description).toBe('Reversal of salary');
      expect(result?.reversalOfTransactionId).toBe('transaction-1');
    });

    it('should return null when the transaction has no reversal', async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      const result = await repository.findReversalForTransaction(
        'transaction-1',
        'user-1',
      );

      expect(result).toBeNull();

      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: {
          reversalOfTransactionId: 'transaction-1',
          account: {
            userId: 'user-1',
          },
        },
      });
    });
  });

  describe('findAllForExportByUser', () => {
    it('should apply every filter, keep the user scope, and skip pagination', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);

      await repository.findAllForExportByUser({
        userId: 'user-1',
        accountId: 'account-1',
        from: '2026-01-01',
        to: '2026-01-31',
        type: TransactionType.EXPENSE,
        expenseCategoryId: 'expense-category-1',
        take: 501,
      });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          account: {
            userId: 'user-1',
          },
          accountId: 'account-1',
          transactionDate: {
            gte: new Date('2026-01-01T00:00:00.000Z'),
            lte: new Date('2026-01-31T00:00:00.000Z'),
          },
          type: TransactionType.EXPENSE,
          expenseCategoryId: 'expense-category-1',
        },
        take: 501,
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          account: { select: { name: true } },
          incomeCategory: { select: { name: true } },
          expenseCategory: { select: { name: true } },
        },
      });

      expect(prisma.transaction.findMany.mock.calls[0][0]).not.toHaveProperty(
        'skip',
      );
      expect(prisma.transaction.count).not.toHaveBeenCalled();
    });

    it('should map each transaction with its account and category name', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          ...createPrismaTransaction({
            id: 'income-1',
            type: 'INCOME',
            incomeCategoryId: 'income-category-1',
          }),
          account: { name: 'Maybank Savings' },
          incomeCategory: { name: 'Salary' },
          expenseCategory: null,
        },
        {
          ...createPrismaTransaction({
            id: 'expense-1',
            type: 'EXPENSE',
            expenseCategoryId: 'expense-category-1',
            description: null,
          }),
          account: { name: 'Credit Card' },
          incomeCategory: null,
          expenseCategory: { name: 'Groceries' },
        },
        {
          ...createPrismaTransaction({
            id: 'income-2',
            type: 'INCOME',
            incomeCategoryId: null,
          }),
          account: { name: 'Maybank Savings' },
          incomeCategory: null,
          expenseCategory: null,
        },
      ]);

      const records = await repository.findAllForExportByUser({
        userId: 'user-1',
        take: 501,
      });

      expect(records.map((record) => record.transaction.id)).toEqual([
        'income-1',
        'expense-1',
        'income-2',
      ]);
      expect(records.map((record) => record.accountName)).toEqual([
        'Maybank Savings',
        'Credit Card',
        'Maybank Savings',
      ]);
      expect(records.map((record) => record.categoryName)).toEqual([
        'Salary',
        'Groceries',
        null,
      ]);
      expect(records[1].transaction.description).toBeNull();
    });

    it('should not expose the account or category relations on the domain transaction', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          ...createPrismaTransaction(),
          account: { name: 'Maybank Savings' },
          incomeCategory: { name: 'Salary' },
          expenseCategory: null,
        },
      ]);

      const [record] = await repository.findAllForExportByUser({
        userId: 'user-1',
        take: 501,
      });

      expect(record.transaction).not.toHaveProperty('account');
      expect(record.transaction).not.toHaveProperty('incomeCategory');
    });
  });

  describe('findAllByAccountForUser', () => {
    it('should apply date, type, and category filters while keeping the user scope', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      await repository.findAllByAccountForUser({
        userId: 'user-1',
        offset: 0,
        limit: 10,
        from: '2026-01-01',
        to: '2026-01-31',
        type: TransactionType.EXPENSE,
        expenseCategoryId: 'category-1',
      });

      const expectedWhere = {
        account: {
          userId: 'user-1',
        },
        transactionDate: {
          gte: new Date('2026-01-01T00:00:00.000Z'),
          lte: new Date('2026-01-31T00:00:00.000Z'),
        },
        type: 'EXPENSE',
        expenseCategoryId: 'category-1',
      };

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
      expect(prisma.transaction.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    });

    it('should omit the account and filter clauses when none are given', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      await repository.findAllByAccountForUser({
        userId: 'user-1',
        offset: 0,
        limit: 10,
      });

      expect(prisma.transaction.count).toHaveBeenCalledWith({
        where: {
          account: {
            userId: 'user-1',
          },
        },
      });
    });

    it('should return paginated transactions and total count', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        createPrismaTransaction({
          type: 'EXPENSE',
          amount: {
            toFixed: () => '120.5000',
          },
          description: 'Groceries',
        }),
      ]);

      prisma.transaction.count.mockResolvedValue(25);

      const result = await repository.findAllByAccountForUser({
        accountId: 'account-1',
        userId: 'user-1',
        offset: 20,
        limit: 5,
      });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          accountId: 'account-1',
          account: {
            userId: 'user-1',
          },
        },
        skip: 20,
        take: 5,
        orderBy: [
          {
            transactionDate: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
      });

      expect(prisma.transaction.count).toHaveBeenCalledWith({
        where: {
          accountId: 'account-1',
          account: {
            userId: 'user-1',
          },
        },
      });

      expect(result.total).toBe(25);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]?.id).toBe('transaction-1');
      expect(result.transactions[0]?.reversalOfTransactionId).toBeNull();
    });

    it('should return an empty page when no transactions exist', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const result = await repository.findAllByAccountForUser({
        accountId: 'account-1',
        userId: 'user-1',
        offset: 0,
        limit: 20,
      });

      expect(result.transactions).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should always enforce account ownership', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      await repository.findAllByAccountForUser({
        accountId: 'account-123',
        userId: 'user-456',
        offset: 0,
        limit: 20,
      });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            accountId: 'account-123',
            account: {
              userId: 'user-456',
            },
          },
        }),
      );

      expect(prisma.transaction.count).toHaveBeenCalledWith({
        where: {
          accountId: 'account-123',
          account: {
            userId: 'user-456',
          },
        },
      });
    });
  });
});
