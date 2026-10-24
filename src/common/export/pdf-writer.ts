import { existsSync } from 'fs';

import PDFDocument from 'pdfkit';

import { ExportColumn, ExportTable } from './export-table';

export interface PdfOptions {
  pageSize: 'A4' | 'LETTER';
  orientation: 'portrait' | 'landscape';
  marginPt: number;
  fontSize: number;
  titleFontSize: number;
  fontPath: string;
  showPageNumbers: boolean;
}

const CELL_PADDING_PT = 4;
const FOOTER_FONT_SIZE_PT = 8;
const CUSTOM_FONT_FAMILY = 'ExportFont';

const DEFAULT_REGULAR_FONT = 'Helvetica';
const DEFAULT_BOLD_FONT = 'Helvetica-Bold';

export const computeColumnWidths = (
  columns: ExportColumn[],
  totalWidth: number,
): number[] => {
  const weights = columns.map((column) => column.widthWeight ?? 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  return weights.map((weight) => (weight / totalWeight) * totalWidth);
};

/**
 * Lays out the table as a paginated PDF. The header row repeats on every
 * page, and the page count is written in a footer once all pages exist.
 */
export const writePdf = async (
  table: ExportTable,
  options: PdfOptions,
): Promise<Buffer> => {
  if (options.fontPath && !existsSync(options.fontPath)) {
    throw new Error(`PDF font file not found at "${options.fontPath}"`);
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: options.pageSize,
      layout: options.orientation,
      margin: options.marginPt,
      bufferPages: true,
      info: { Title: table.title },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    if (options.fontPath) {
      doc.registerFont(CUSTOM_FONT_FAMILY, options.fontPath);
    }
    const regularFont = options.fontPath
      ? CUSTOM_FONT_FAMILY
      : DEFAULT_REGULAR_FONT;
    const boldFont = options.fontPath ? CUSTOM_FONT_FAMILY : DEFAULT_BOLD_FONT;

    const left = doc.page.margins.left;
    const pageWidth = doc.page.width - left - doc.page.margins.right;
    const columnWidths = computeColumnWidths(table.columns, pageWidth);

    const measureRow = (cells: string[], font: string): number => {
      doc.font(font).fontSize(options.fontSize);
      const tallestCell = Math.max(
        ...cells.map((cell, index) =>
          doc.heightOfString(cell, {
            width: columnWidths[index] - 2 * CELL_PADDING_PT,
          }),
        ),
      );

      return tallestCell + 2 * CELL_PADDING_PT;
    };

    const drawRow = (cells: string[], font: string, rowHeight: number) => {
      const rowTop = doc.y;
      let x = left;

      cells.forEach((cell, index) => {
        const column = table.columns[index];
        doc
          .font(font)
          .fontSize(options.fontSize)
          .text(cell, x + CELL_PADDING_PT, rowTop + CELL_PADDING_PT, {
            width: columnWidths[index] - 2 * CELL_PADDING_PT,
            align: column.align ?? 'left',
          });
        x += columnWidths[index];
      });

      doc.x = left;
      doc.y = rowTop + rowHeight;
    };

    const headerCells = table.columns.map((column) => column.header);
    const drawHeader = () => {
      drawRow(headerCells, boldFont, measureRow(headerCells, boldFont));
    };

    try {
      doc.font(boldFont).fontSize(options.titleFontSize);
      doc.text(table.title, left, doc.y, { width: pageWidth });

      doc.font(regularFont).fontSize(options.fontSize);
      doc.text(`Generated at ${table.generatedAt.toISOString()}`, {
        width: pageWidth,
      });
      table.filters.forEach((filter) => doc.text(filter, { width: pageWidth }));
      doc.moveDown(0.5);

      drawHeader();

      table.rows.forEach((row) => {
        const rowHeight = measureRow(row, regularFont);

        if (doc.y + rowHeight > doc.page.maxY()) {
          doc.addPage();
          drawHeader();
        }

        drawRow(row, regularFont, rowHeight);
      });

      if (options.showPageNumbers) {
        drawPageNumbers(doc, regularFont, pageWidth, left);
      }

      doc.end();
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
};

/**
 * The footer sits inside the bottom margin. pdfkit starts a new page when
 * text lands below the bottom margin, so that margin is zeroed while the
 * footer is written.
 */
const drawPageNumbers = (
  doc: InstanceType<typeof PDFDocument>,
  font: string,
  pageWidth: number,
  left: number,
): void => {
  const { start, count } = doc.bufferedPageRange();

  for (let index = start; index < start + count; index++) {
    doc.switchToPage(index);

    const { bottom } = doc.page.margins;
    const footerY = doc.page.height - bottom / 2;
    doc.page.margins.bottom = 0;
    doc
      .font(font)
      .fontSize(FOOTER_FONT_SIZE_PT)
      .text(`Page ${index - start + 1} of ${count}`, left, footerY, {
        width: pageWidth,
        align: 'center',
        lineBreak: false,
      });
    doc.page.margins.bottom = bottom;
  }
};
