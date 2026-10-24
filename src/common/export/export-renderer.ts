import { StreamableFile } from '@nestjs/common';

import { readAppConfigFile } from '../../config/app-config';
import { buildCsv } from './csv-writer';
import { buildExportFileName } from './export-file-name';
import { ExportFormat, ExportTable } from './export-table';
import { writePdf } from './pdf-writer';

export interface RenderedExport {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

interface RenderExportInput {
  table: ExportTable;
  format: ExportFormat;
  resource: string;
}

const CONTENT_TYPES: Record<ExportFormat, string> = {
  [ExportFormat.CSV]: 'text/csv; charset=utf-8',
  [ExportFormat.PDF]: 'application/pdf',
};

export const renderExport = async ({
  table,
  format,
  resource,
}: RenderExportInput): Promise<RenderedExport> => {
  const exportConfig = readAppConfigFile().export;

  const buffer =
    format === ExportFormat.CSV
      ? Buffer.from(
          buildCsv(table, {
            delimiter: exportConfig.csv.delimiter,
            includeUtf8Bom: exportConfig.csv.includeUtf8Bom,
            neutralizeFormulas: exportConfig.csv.neutralizeFormulas,
          }),
          'utf8',
        )
      : await writePdf(table, exportConfig.pdf);

  return {
    buffer,
    contentType: CONTENT_TYPES[format],
    fileName: buildExportFileName({
      prefix: exportConfig.fileNamePrefix,
      resource,
      format,
      generatedAt: table.generatedAt,
    }),
  };
};

export const toStreamableFile = (rendered: RenderedExport): StreamableFile =>
  new StreamableFile(rendered.buffer, {
    type: rendered.contentType,
    disposition: `attachment; filename="${rendered.fileName}"`,
    length: rendered.buffer.length,
  });
