import { TransactionType } from '../../domain/entities/transaction.entity';
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
      transactionDate: Date;
      reversalOfTransactionId: string | null;
    }> = {},
  ) => ({
    accountId: 'account-1',
    type: TransactionType.INCOME,
    amount: '5000.5000',
    currency: 'MYR',
    description: 'Salary',
    transactionDate,
    reversalOfTransactionId: null,
    ...overrides,
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
        data: createTransactionInput(),
      });

      expect(result.id).toBe('transaction-1');
      expect(result.accountId).toBe('account-1');
      expect(result.type).toBe(TransactionType.INCOME);
      expect(result.amount).toBe('5000.5000');
      expect(result.currency).toBe('MYR');
      expect(result.description).toBe('Salary');
      expect(result.reversalOfTransactionId).toBeNull();
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
        transactionDate: new Date('2026-09-21T00:00:00.000Z'),
        reversalOfTransactionId: 'transaction-1',
      });

      const result = await repository.create(input);

      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: input,
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

  describe('findAllByAccountForUser', () => {
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
