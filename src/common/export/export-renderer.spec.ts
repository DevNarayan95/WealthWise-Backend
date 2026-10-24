import { ExportFormat, ExportTable } from './export-table';
import { renderExport, toStreamableFile } from './export-renderer';

const table: ExportTable = {
  title: 'Accounts',
  generatedAt: new Date('2026-05-01T10:00:00.000Z'),
  filters: [],
  columns: [{ header: 'Name' }, { header: 'Balance', align: 'right' }],
  rows: [['Savings', '100.00']],
};

describe('renderExport', () => {
  it('should render CSV with the configured prefix and a dated file name', async () => {
    const rendered = await renderExport({
      table,
      format: ExportFormat.CSV,
      resource: 'accounts',
    });

    expect(rendered.contentType).toBe('text/csv; charset=utf-8');
    expect(rendered.fileName).toBe('navro-accounts-2026-05-01.csv');
    expect(rendered.buffer.toString('utf8')).toContain(
      'Name,Balance\r\nSavings,100.00\r\n',
    );
  });

  it('should render PDF bytes with a PDF file name', async () => {
    const rendered = await renderExport({
      table,
      format: ExportFormat.PDF,
      resource: 'accounts',
    });

    expect(rendered.contentType).toBe('application/pdf');
    expect(rendered.fileName).toBe('navro-accounts-2026-05-01.pdf');
    expect(rendered.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});

describe('toStreamableFile', () => {
  it('should send an attachment with the content type, file name and length', () => {
    const file = toStreamableFile({
      buffer: Buffer.from('abc'),
      contentType: 'text/csv; charset=utf-8',
      fileName: 'navro-accounts-2026-05-01.csv',
    });

    const options = file.getHeaders();

    expect(options.type).toBe('text/csv; charset=utf-8');
    expect(options.disposition).toBe(
      'attachment; filename="navro-accounts-2026-05-01.csv"',
    );
    expect(options.length).toBe(3);
  });
});
