import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { ExportFormat } from '../export-table';

export class ExportQueryDto {
  @ApiProperty({
    enum: ExportFormat,
    example: ExportFormat.CSV,
    description: 'File format of the export.',
  })
  @IsEnum(ExportFormat)
  format: ExportFormat;
}
