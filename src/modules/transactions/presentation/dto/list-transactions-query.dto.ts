import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { PAGINATION } from '../../../../common/pagination/pagination-config';

export class ListTransactionsQueryDto {
  @ApiProperty({
    example: 'b7c4a3d2-7e9f-4f3b-8e6a-1d2c3b4a5e6f',
    format: 'uuid',
    description: 'Account whose transactions should be listed.',
  })
  @IsUUID()
  accountId!: string;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    example: PAGINATION.defaultPageSize,
    default: PAGINATION.defaultPageSize,
    minimum: 1,
    maximum: PAGINATION.maxPageSize,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION.maxPageSize)
  limit = PAGINATION.defaultPageSize;
}
