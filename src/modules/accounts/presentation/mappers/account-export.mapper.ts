import { Account } from '../../domain/entities/account.entity';
import { ExportTable } from '../../../../common/export/export-table';

export class AccountExportMapper {
  static toExportTable(accounts: Account[], generatedAt: Date): ExportTable {
    return {
      title: 'Accounts',
      generatedAt,
      filters: [],
      columns: [
        { header: 'Name' },
        { header: 'Type' },
        { header: 'Currency' },
        { header: 'Opening Balance', align: 'right' },
        { header: 'Status' },
        { header: 'Created At' },
        { header: 'Updated At' },
      ],
      rows: accounts.map((account) => [
        account.name,
        account.type,
        account.currency,
        account.openingBalance,
        account.status,
        account.createdAt.toISOString(),
        account.updatedAt.toISOString(),
      ]),
    };
  }
}
