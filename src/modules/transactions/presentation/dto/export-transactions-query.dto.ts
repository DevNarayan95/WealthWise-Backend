import { IntersectionType, OmitType } from '@nestjs/swagger';
import { ExportQueryDto } from '../../../../common/export/dto/export-query.dto';
import { ListTransactionsQueryDto } from './list-transactions-query.dto';

export class ExportTransactionsQueryDto extends IntersectionType(
  OmitType(ListTransactionsQueryDto, ['page', 'limit'] as const),
  ExportQueryDto,
) {}
