import { ExpenseCategory } from '../../domain/entities/expense-category.entity';
import { ExpenseCategoryExportMapper } from './expense-category-export.mapper';

describe('ExpenseCategoryExportMapper', () => {
  const generatedAt = new Date('2026-09-21T08:00:00.000Z');
  const createdAt = new Date('2026-09-20T10:00:00.000Z');
  const updatedAt = new Date('2026-09-20T11:00:00.000Z');

  describe('toExportTable', () => {
    it('should describe the expense categories table with its title and columns', () => {
      const table = ExpenseCategoryExportMapper.toExportTable([], generatedAt);

      expect(table.title).toBe('Expense Categories');
      expect(table.generatedAt).toBe(generatedAt);
      expect(table.filters).toEqual([]);
      expect(table.columns.map((column) => column.header)).toEqual([
        'Name',
        'Source',
        'Created At',
        'Updated At',
      ]);
      expect(table.rows).toEqual([]);
    });

    it('should map custom categories as custom and system categories as system', () => {
      const customCategory = ExpenseCategory.create({
        id: 'category-1',
        userId: 'user-1',
        name: 'Gym',
        isArchived: false,
        createdAt,
        updatedAt,
      });
      const systemCategory = ExpenseCategory.create({
        id: 'system-category-1',
        userId: null,
        name: 'Groceries',
        isArchived: false,
        createdAt,
        updatedAt,
      });

      const table = ExpenseCategoryExportMapper.toExportTable(
        [customCategory, systemCategory],
        generatedAt,
      );

      expect(table.rows).toEqual([
        ['Gym', 'Custom', createdAt.toISOString(), updatedAt.toISOString()],
        [
          'Groceries',
          'System',
          createdAt.toISOString(),
          updatedAt.toISOString(),
        ],
      ]);
    });
  });
});
