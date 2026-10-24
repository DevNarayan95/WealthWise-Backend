import { buildExportFileName } from './export-file-name';
import { ExportFormat } from './export-table';

describe('buildExportFileName', () => {
  it('should build a prefixed, dated file name with the format extension', () => {
    const fileName = buildExportFileName({
      prefix: 'navro',
      resource: 'transactions',
      format: ExportFormat.CSV,
      generatedAt: new Date('2026-05-01T10:00:00.000Z'),
    });

    expect(fileName).toBe('navro-transactions-2026-05-01.csv');
  });

  it('should use the UTC date regardless of the local time of day', () => {
    const fileName = buildExportFileName({
      prefix: 'navro',
      resource: 'accounts',
      format: ExportFormat.PDF,
      generatedAt: new Date('2026-05-02T03:30:00.000Z'),
    });

    expect(fileName).toBe('navro-accounts-2026-05-02.pdf');
  });
});
