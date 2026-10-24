import {
  Account,
  AccountStatus,
  AccountType,
} from '../../domain/entities/account.entity';
import { AccountExportMapper } from './account-export.mapper';

describe('AccountExportMapper', () => {
  const generatedAt = new Date('2026-05-01T10:00:00.000Z');

  const account = Account.create({
    id: 'account-id',
    userId: 'user-id',
    name: 'Maybank Savings',
    type: AccountType.BANK_ACCOUNT,
    currency: 'MYR',
    openingBalance: '1250.5000',
    status: AccountStatus.ACTIVE,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-02T00:00:00.000Z'),
  });

  describe('toExportTable', () => {
    it('should build an Accounts table with one row per account', () => {
      const table = AccountExportMapper.toExportTable([account], generatedAt);

      expect(table.title).toBe('Accounts');
      expect(table.generatedAt).toBe(generatedAt);
      expect(table.filters).toEqual([]);
      expect(table.columns.map((column) => column.header)).toEqual([
        'Name',
        'Type',
        'Currency',
        'Opening Balance',
        'Status',
        'Created At',
        'Updated At',
      ]);
      expect(table.rows).toEqual([
        [
          'Maybank Savings',
          AccountType.BANK_ACCOUNT,
          'MYR',
          '1250.5000',
          AccountStatus.ACTIVE,
          '2026-08-01T00:00:00.000Z',
          '2026-08-02T00:00:00.000Z',
        ],
      ]);
    });

    it('should right-align the opening balance column', () => {
      const table = AccountExportMapper.toExportTable([account], generatedAt);

      expect(table.columns[3]).toEqual({
        header: 'Opening Balance',
        align: 'right',
      });
    });

    it('should not expose the account or user identifiers', () => {
      const table = AccountExportMapper.toExportTable([account], generatedAt);

      expect(JSON.stringify(table)).not.toContain('account-id');
      expect(JSON.stringify(table)).not.toContain('user-id');
    });

    it('should return only the header when there are no accounts', () => {
      const table = AccountExportMapper.toExportTable([], generatedAt);

      expect(table.rows).toEqual([]);
      expect(table.columns).toHaveLength(7);
    });
  });
});
