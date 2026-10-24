import { IncomeCategory } from '../../domain/entities/income-category.entity';
import { IncomeCategoryExportMapper } from './income-category-export.mapper';

describe('IncomeCategoryExportMapper', () => {
  const generatedAt = new Date('2026-09-21T08:00:00.000Z');
  const createdAt = new Date('2026-09-20T10:00:00.000Z');
  const updatedAt = new Date('2026-09-20T11:00:00.000Z');

  describe('toExportTable', () => {
    it('should describe the income categories table with its title and columns', () => {
      const table = IncomeCategoryExportMapper.toExportTable([], generatedAt);

      expect(table.title).toBe('Income Categories');
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
      const customCategory = IncomeCategory.create({
        id: 'category-1',
        userId: 'user-1',
        name: 'Freelance',
        isArchived: false,
        createdAt,
        updatedAt,
      });
      const systemCategory = IncomeCategory.create({
        id: 'system-category-1',
        userId: null,
        name: 'Salary',
        isArchived: false,
        createdAt,
        updatedAt,
      });

      const table = IncomeCategoryExportMapper.toExportTable(
        [customCategory, systemCategory],
        generatedAt,
      );

      expect(table.rows).toEqual([
        [
          'Freelance',
          'Custom',
          createdAt.toISOString(),
          updatedAt.toISOString(),
        ],
        ['Salary', 'System', createdAt.toISOString(), updatedAt.toISOString()],
      ]);
    });
  });
});
