import { IncomeCategory } from '../../domain/entities/income-category.entity';
import { ExportTable } from '../../../../common/export/export-table';

export class IncomeCategoryExportMapper {
  static toExportTable(
    categories: IncomeCategory[],
    generatedAt: Date,
  ): ExportTable {
    return {
      title: 'Income Categories',
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
