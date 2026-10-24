import { ExpenseCategory } from '../../domain/entities/expense-category.entity';
import { ExportTable } from '../../../../common/export/export-table';

export class ExpenseCategoryExportMapper {
  static toExportTable(
    categories: ExpenseCategory[],
    generatedAt: Date,
  ): ExportTable {
    return {
      title: 'Expense Categories',
      generatedAt,
      filters: [],
      columns: [
        { header: 'Name' },
        { header: 'Source' },
        { header: 'Created At' },
        { header: 'Updated At' },
      ],
      rows: categories.map((category) => [
        category.name,
        category.isSystem ? 'System' : 'Custom',
        category.createdAt.toISOString(),
        category.updatedAt.toISOString(),
      ]),
    };
  }
}
