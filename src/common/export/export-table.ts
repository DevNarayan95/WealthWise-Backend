export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
}

export type ExportAlignment = 'left' | 'right';

export interface ExportColumn {
  header: string;
  widthWeight?: number;
  align?: ExportAlignment;
}

/**
 * Format-neutral table shared by the CSV and PDF writers.
 * Every cell is already a display string; writers only escape or lay it out.
 */
export interface ExportTable {
  title: string;
  generatedAt: Date;
  filters: string[];
  columns: ExportColumn[];
  rows: string[][];
}
