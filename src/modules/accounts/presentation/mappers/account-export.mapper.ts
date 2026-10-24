import { AccountExportRecord } from '../../application/outputs/account-export-record.output';
import { ExportTable } from '../../../../common/export/export-table';

export class AccountExportMapper {
  static toExportTable(
    records: AccountExportRecord[],
    generatedAt: Date,
  ): ExportTable {
    return {
      title: 'Accounts',
      generatedAt,
      filters: [],
      columns: [
        { header: 'Name' },
        { header: 'Type' },
        { header: 'Currency' },
        { header: 'Opening Balance', align: 'right' },
        { header: 'Current Balance', align: 'right' },
        { header: 'Status' },
        { header: 'Created At' },
        { header: 'Updated At' },
      ],
      rows: records.map(({ account, currentBalance }) => [
        account.name,
        account.type,
        account.currency,
        account.openingBalance,
        currentBalance,
        account.status,
        account.createdAt.toISOString(),
        account.updatedAt.toISOString(),
      ]),
    };
  }
}
