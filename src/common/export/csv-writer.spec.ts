import { buildCsv, CsvOptions } from './csv-writer';
import { ExportTable } from './export-table';

const baseOptions: CsvOptions = {
  delimiter: ',',
  includeUtf8Bom: false,
  neutralizeFormulas: true,
};

const buildTable = (rows: string[][]): ExportTable => ({
  title: 'Accounts',
  generatedAt: new Date('2026-05-01T10:00:00.000Z'),
  filters: ['Type: SAVINGS'],
  columns: [{ header: 'Name' }, { header: 'Balance', align: 'right' }],
  rows,
});

describe('buildCsv', () => {
  it('should write the header row and data rows with CRLF line endings', () => {
    const csv = buildCsv(buildTable([['Savings', '100.00']]), baseOptions);

    expect(csv).toBe('Name,Balance\r\nSavings,100.00\r\n');
  });

  it('should write only the header row when there are no rows', () => {
    expect(buildCsv(buildTable([]), baseOptions)).toBe('Name,Balance\r\n');
  });

  it('should not include the title, generated-at time or filters', () => {
    const csv = buildCsv(buildTable([['Savings', '1']]), baseOptions);

    expect(csv).not.toContain('Accounts');
    expect(csv).not.toContain('Type: SAVINGS');
  });

  it('should prefix a UTF-8 byte order mark when enabled', () => {
    const csv = buildCsv(buildTable([]), {
      ...baseOptions,
      includeUtf8Bom: true,
    });

    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('should quote values containing the delimiter, quotes or line breaks', () => {
    const csv = buildCsv(
      buildTable([['Food, drinks', 'He said "hi"\nbye']]),
      baseOptions,
    );

    expect(csv).toContain('"Food, drinks","He said ""hi""\nbye"\r\n');
  });

  it('should use the configured delimiter', () => {
    const csv = buildCsv(buildTable([['a;b', '1']]), {
      ...baseOptions,
      delimiter: ';',
    });

    expect(csv).toBe('Name;Balance\r\n"a;b";1\r\n');
  });

  it('should neutralize spreadsheet formula prefixes when enabled', () => {
    const csv = buildCsv(
      buildTable([
        ['=1+1', '+1'],
        ['@SUM', 'Normal'],
      ]),
      baseOptions,
    );

    expect(csv).toBe("Name,Balance\r\n'=1+1,'+1\r\n'@SUM,Normal\r\n");
  });

  it('should keep negative and plain numbers unchanged when neutralizing', () => {
    const csv = buildCsv(buildTable([['-100.00', '250']]), baseOptions);

    expect(csv).toBe('Name,Balance\r\n-100.00,250\r\n');
  });

  it('should leave formula-like values untouched when neutralizing is disabled', () => {
    const csv = buildCsv(buildTable([['=1+1', '@SUM']]), {
      ...baseOptions,
      neutralizeFormulas: false,
    });

    expect(csv).toBe('Name,Balance\r\n=1+1,@SUM\r\n');
  });
});
