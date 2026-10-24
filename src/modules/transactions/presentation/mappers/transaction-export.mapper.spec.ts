import {
  Transaction,
  TransactionType,
} from '../../domain/entities/transaction.entity';
import { TransactionExportMapper } from './transaction-export.mapper';

describe('TransactionExportMapper', () => {
  const generatedAt = new Date('2026-05-01T10:00:00.000Z');

  const createTransaction = (
    overrides: Partial<{
      id: string;
      type: TransactionType;
      description: string | null;
      transactionDate: string;
    }> = {},
  ) =>
    Transaction.create({
      id: 'transaction-id',
      accountId: 'account-id',
      type: TransactionType.EXPENSE,
      amount: '50.0000',
      currency: 'MYR',
      description: 'Lunch',
      transactionDate: '2026-09-01',
      reversalOfTransactionId: null,
      incomeCategoryId: null,
      expenseCategoryId: 'expense-category-id',
      baseCurrency: 'INR',
      baseAmount: '1000.0000',
      exchangeRate: '20.00000000',
      rateDate: '2026-09-01',
      rateSource: 'PROVIDER',
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
      updatedAt: new Date('2026-09-01T10:00:00.000Z'),
      ...overrides,
    });

  describe('toExportTable', () => {
    it('should build a Transactions table with one row per record', () => {
      const table = TransactionExportMapper.toExportTable(
        [
          {
            transaction: createTransaction(),
            accountName: 'Credit Card',
            categoryName: 'Groceries',
          },
        ],
        generatedAt,
        ['Type: EXPENSE'],
      );

      expect(table.title).toBe('Transactions');
      expect(table.generatedAt).toBe(generatedAt);
      expect(table.filters).toEqual(['Type: EXPENSE']);
      expect(table.columns.map((column) => column.header)).toEqual([
        'Date',
        'Type',
        'Account',
        'Category',
        'Description',
        'Amount',
        'Currency',
        'Base Amount',
        'Base Currency',
        'Exchange Rate',
        'Rate Date',
      ]);
      expect(table.rows).toEqual([
        [
          '2026-09-01',
          'EXPENSE',
          'Credit Card',
          'Groceries',
          'Lunch',
          '50.0000',
          'MYR',
          '1000.0000',
          'INR',
          '20.00000000',
          '2026-09-01',
        ],
      ]);
    });

    it('should leave category and description blank when they are missing', () => {
      const table = TransactionExportMapper.toExportTable(
        [
          {
            transaction: createTransaction({ description: null }),
            accountName: 'Maybank Savings',
            categoryName: null,
          },
        ],
        generatedAt,
        [],
      );

      expect(table.rows[0][3]).toBe('');
      expect(table.rows[0][4]).toBe('');
    });

    it('should right-align the monetary and rate columns', () => {
      const table = TransactionExportMapper.toExportTable([], generatedAt, []);

      const alignedHeaders = table.columns
        .filter((column) => column.align === 'right')
        .map((column) => column.header);

      expect(alignedHeaders).toEqual([
        'Amount',
        'Base Amount',
        'Exchange Rate',
      ]);
    });

    it('should not expose transaction, account, or user identifiers', () => {
      const table = TransactionExportMapper.toExportTable(
        [
          {
            transaction: createTransaction(),
            accountName: 'Credit Card',
            categoryName: 'Groceries',
          },
        ],
        generatedAt,
        [],
      );

      const serialized = JSON.stringify(table);

      expect(serialized).not.toContain('transaction-id');
      expect(serialized).not.toContain('account-id');
      expect(serialized).not.toContain('expense-category-id');
    });
  });

  describe('toFilterLabels', () => {
    it('should describe the date range and type filters', () => {
      expect(
        TransactionExportMapper.toFilterLabels({
          from: '2026-01-01',
          to: '2026-01-31',
          type: TransactionType.INCOME,
        }),
      ).toEqual(['From: 2026-01-01', 'To: 2026-01-31', 'Type: INCOME']);
    });

    it('should return no labels when no filter is applied', () => {
      expect(TransactionExportMapper.toFilterLabels({})).toEqual([]);
    });
  });
});
