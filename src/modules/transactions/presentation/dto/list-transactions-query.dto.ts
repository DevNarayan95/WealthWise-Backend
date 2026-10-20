import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { PAGINATION } from '../../../../common/pagination/pagination-config';
import { TransactionType } from '../../domain/entities/transaction.entity';

export class ListTransactionsQueryDto {
  @ApiPropertyOptional({
    example: 'b7c4a3d2-7e9f-4f3b-8e6a-1d2c3b4a5e6f',
    format: 'uuid',
    description:
      'Account whose transactions should be listed. Omit to list transactions across all accounts of the user.',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    example: '2026-01-01',
    format: 'date',
    description:
      'Inclusive start date (YYYY-MM-DD) on transactionDate. Use with to for month-wise or year-wise history.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from must use the YYYY-MM-DD format',
  })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-01-31',
    format: 'date',
    description:
      'Inclusive end date (YYYY-MM-DD) on transactionDate. Must not be earlier than from.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to must use the YYYY-MM-DD format',
  })
  to?: string;

  @ApiPropertyOptional({
    enum: TransactionType,
    example: TransactionType.EXPENSE,
    description: 'Only return transactions of this type.',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({
    example: '8a6f0c8d-5f65-4e6e-8c9e-9d1e5e6b8a12',
    format: 'uuid',
    description: 'Only return INCOME transactions in this income category.',
  })
  @IsOptional()
  @IsUUID()
  incomeCategoryId?: string;

  @ApiPropertyOptional({
    example: '3f2b9c1e-7d4a-4b8e-9f10-2a6c5d8e1b47',
    format: 'uuid',
    description: 'Only return EXPENSE transactions in this expense category.',
  })
  @IsOptional()
  @IsUUID()
  expenseCategoryId?: string;

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
