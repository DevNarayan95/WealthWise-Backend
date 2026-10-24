import { ExportTable } from './export-table';
import { computeColumnWidths, PdfOptions, writePdf } from './pdf-writer';

const baseOptions: PdfOptions = {
  pageSize: 'A4',
  orientation: 'portrait',
  marginPt: 36,
  fontSize: 9,
  titleFontSize: 16,
  fontPath: '',
  showPageNumbers: true,
};

const buildTable = (rowCount: number): ExportTable => ({
  title: 'Transactions',
  generatedAt: new Date('2026-05-01T10:00:00.000Z'),
  filters: ['Type: EXPENSE'],
  columns: [{ header: 'Date' }, { header: 'Amount', align: 'right' }],
  rows: Array.from({ length: rowCount }, (_, index) => [
    `2026-05-${String((index % 28) + 1).padStart(2, '0')}`,
    `${index}.00`,
  ]),
});

const countPages = (pdf: Buffer): number =>
  (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

describe('pdf-writer', () => {
  describe('computeColumnWidths', () => {
    it('should split the width by column weight', () => {
      const widths = computeColumnWidths(
        [
          { header: 'A', widthWeight: 1 },
          { header: 'B', widthWeight: 3 },
        ],
        400,
      );

      expect(widths).toEqual([100, 300]);
    });

    it('should give equal widths when weights are omitted', () => {
      const widths = computeColumnWidths(
        [{ header: 'A' }, { header: 'B' }, { header: 'C' }, { header: 'D' }],
        400,
      );

      expect(widths).toEqual([100, 100, 100, 100]);
    });
  });

  describe('writePdf', () => {
    it('should produce a PDF document', async () => {
      const pdf = await writePdf(buildTable(3), baseOptions);

      expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(pdf.toString('latin1').trimEnd().endsWith('%%EOF')).toBe(true);
    });

    it('should render a single page for a short table', async () => {
      const pdf = await writePdf(buildTable(3), baseOptions);

      expect(countPages(pdf)).toBe(1);
    });

    it('should start a new page when rows overflow the page', async () => {
      const pdf = await writePdf(buildTable(300), baseOptions);

      expect(countPages(pdf)).toBeGreaterThan(1);
    });

    it('should render a header-only document when there are no rows', async () => {
      const pdf = await writePdf(buildTable(0), baseOptions);

      expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(countPages(pdf)).toBe(1);
    });

    it('should render in landscape orientation', async () => {
      const pdf = await writePdf(buildTable(3), {
        ...baseOptions,
        orientation: 'landscape',
      });

      expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });

    it('should fail clearly when the configured font file does not exist', async () => {
      await expect(
        writePdf(buildTable(1), {
          ...baseOptions,
          fontPath: '/does/not/exist.ttf',
        }),
      ).rejects.toThrow('PDF font file not found at "/does/not/exist.ttf"');
    });
  });
});
