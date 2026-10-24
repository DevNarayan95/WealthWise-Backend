import { ExportTable } from '../../../../common/export/export-table';
import { TransactionType } from '../../domain/entities/transaction.entity';
import { TransactionExportRecord } from '../../domain/repositories/transaction.repository';

export interface TransactionExportFilters {
  from?: string;
  to?: string;
  type?: TransactionType;
}

export class TransactionExportMapper {
  static toExportTable(
    records: TransactionExportRecord[],
    generatedAt: Date,
    filters: string[],
  ): ExportTable {
    return {
      title: 'Transactions',
      generatedAt,
      filters,
      columns: [
        { header: 'Date', widthWeight: 1 },
        { header: 'Type', widthWeight: 1 },
        { header: 'Account', widthWeight: 2 },
        { header: 'Category', widthWeight: 2 },
        { header: 'Description', widthWeight: 3 },
        { header: 'Amount', align: 'right', widthWeight: 1 },
        { header: 'Currency', widthWeight: 1 },
        { header: 'Base Amount', align: 'right', widthWeight: 1 },
        { header: 'Base Currency', widthWeight: 1 },
        { header: 'Exchange Rate', align: 'right', widthWeight: 1 },
        { header: 'Rate Date', widthWeight: 1 },
      ],
      rows: records.map(({ transaction, accountName, categoryName }) => [
        transaction.transactionDate,
        transaction.type,
        accountName,
        categoryName ?? '',
        transaction.description ?? '',
        transaction.amount,
        transaction.currency,
        transaction.baseAmount,
        transaction.baseCurrency,
        transaction.exchangeRate,
        transaction.rateDate,
      ]),
    };
  }

  static toFilterLabels(filters: TransactionExportFilters): string[] {
    const labels: string[] = [];

    if (filters.from !== undefined) {
      labels.push(`From: ${filters.from}`);
    }

    if (filters.to !== undefined) {
      labels.push(`To: ${filters.to}`);
    }

    if (filters.type !== undefined) {
      labels.push(`Type: ${filters.type}`);
    }

    return labels;
  }
}
