import { ExportFormat } from './export-table';

interface ExportFileNameInput {
  prefix: string;
  resource: string;
  format: ExportFormat;
  generatedAt: Date;
}

export const buildExportFileName = ({
  prefix,
  resource,
  format,
  generatedAt,
}: ExportFileNameInput): string => {
  const datePart = generatedAt.toISOString().slice(0, 10);

  return `${prefix}-${resource}-${datePart}.${format}`;
};
