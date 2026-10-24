import { ExportTable } from './export-table';

export interface CsvOptions {
  delimiter: string;
  includeUtf8Bom: boolean;
  neutralizeFormulas: boolean;
}

const UTF8_BOM = '\uFEFF';
const LINE_BREAK = '\r\n';
const FORMULA_START_PATTERN = /^[=+\-@\t\r]/;
const PLAIN_NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;
const QUOTING_PATTERN = /["\r\n]/;

// Prefixing with an apostrophe stops spreadsheet apps from running the cell as a formula.
// Plain numbers such as "-100.00" are data, so they are left as they are.
const neutralizeFormula = (value: string): string =>
  FORMULA_START_PATTERN.test(value) && !PLAIN_NUMBER_PATTERN.test(value)
    ? `'${value}`
    : value;

const escapeCell = (value: string, options: CsvOptions): string => {
  const safeValue = options.neutralizeFormulas
    ? neutralizeFormula(value)
    : value;
  const needsQuoting =
    safeValue.includes(options.delimiter) || QUOTING_PATTERN.test(safeValue);

  return needsQuoting ? `"${safeValue.replace(/"/g, '""')}"` : safeValue;
};

export const buildCsv = (table: ExportTable, options: CsvOptions): string => {
  const headerLine = table.columns.map((column) =>
    escapeCell(column.header, options),
  );
  const dataLines = table.rows.map((row) =>
    row.map((cell) => escapeCell(cell, options)),
  );

  const body = [headerLine, ...dataLines]
    .map((cells) => cells.join(options.delimiter))
    .join(LINE_BREAK);

  return `${options.includeUtf8Bom ? UTF8_BOM : ''}${body}${LINE_BREAK}`;
};
