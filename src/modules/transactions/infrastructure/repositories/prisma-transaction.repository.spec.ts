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

  let repository: PrismaTransactionRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    repository = new PrismaTransactionRepository(prisma as never);
  });

  describe('create', () => {
    it('should create and map a transaction', async () => {
      prisma.transaction.create.mockResolvedValue({
        id: 'transaction-1',
        accountId: 'account-1',
        type: 'INCOME',
        amount: {
          toFixed: () => '5000.5000',
        },
        currency: 'MYR',
        description: 'Salary',
        transactionDate: new Date('2026-09-20T00:00:00.000Z'),
        createdAt: new Date('2026-09-20T10:00:00.000Z'),
        updatedAt: new Date('2026-09-20T10:00:00.000Z'),
      });

      const result = await repository.create({
        accountId: 'account-1',
        type: TransactionType.INCOME,
        amount: '5000.5000',
        currency: 'MYR',
        description: 'Salary',
        transactionDate: new Date('2026-09-20T00:00:00.000Z'),
      });

      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          accountId: 'account-1',
          type: TransactionType.INCOME,
          amount: '5000.5000',
          currency: 'MYR',
          description: 'Salary',
          transactionDate: new Date('2026-09-20T00:00:00.000Z'),
        },
      });

      expect(result.id).toBe('transaction-1');
      expect(result.accountId).toBe('account-1');
      expect(result.type).toBe(TransactionType.INCOME);
      expect(result.amount).toBe('5000.5000');
      expect(result.currency).toBe('MYR');
      expect(result.description).toBe('Salary');
    });
  });

  describe('findByIdForUser', () => {
    it('should return a transaction belonging to the user', async () => {
      prisma.transaction.findFirst.mockResolvedValue({
        id: 'transaction-1',
        accountId: 'account-1',
        type: 'EXPENSE',
        amount: {
          toFixed: () => '5000.5000',
        },
        currency: 'MYR',
        description: 'Salary',
        transactionDate: new Date('2026-09-20T00:00:00.000Z'),
        createdAt: new Date('2026-09-20T10:00:00.000Z'),
        updatedAt: new Date('2026-09-20T10:00:00.000Z'),
      });

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

  describe('findAllByAccountForUser', () => {
    it('should return paginated transactions and total count', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 'transaction-1',
          accountId: 'account-1',
          type: 'EXPENSE',
          amount: {
            toFixed: () => '120.5000',
          },
          currency: 'MYR',
          description: 'Groceries',
          transactionDate: new Date('2026-09-20T00:00:00.000Z'),
          createdAt: new Date('2026-09-20T10:00:00.000Z'),
          updatedAt: new Date('2026-09-20T10:00:00.000Z'),
        },
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
