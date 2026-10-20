import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../domain/entities/transaction.entity';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({
    example: 'b7c4a3d2-7e9f-4f3b-8e6a-1d2c3b4a5e6f',
    format: 'uuid',
  })
  @IsUUID()
  accountId!: string;

  @ApiProperty({
    enum: TransactionType,
    example: TransactionType.EXPENSE,
  })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiProperty({
    example: '50.00',
    description:
      'Positive transaction amount with up to 15 integer digits and 4 decimal places.',
  })
  @IsString()
  @Matches(/^(?=.*[1-9])\d{1,15}(?:\.\d{1,4})?$/)
  amount!: string;

  @ApiProperty({
    example: 'MYR',
    description: 'Three-letter ISO 4217 currency code.',
  })
  @IsString()
  @Matches(/^[A-Za-z]{3}$/)
  currency!: string;

  @ApiPropertyOptional({
    example: 'Lunch',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;

  @ApiProperty({
    example: '2026-09-01',
    format: 'date',
    description:
      'Calendar date (YYYY-MM-DD) in the user local date. Times and time zones are not accepted.',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'transactionDate must use the YYYY-MM-DD format',
  })
  transactionDate!: string;

  @ApiPropertyOptional({
    example: '8a6f0c8d-5f65-4e6e-8c9e-9d1e5e6b8a12',
    format: 'uuid',
    nullable: true,
    description:
      'Income category for an INCOME transaction. Must be omitted or null for EXPENSE transactions.',
  })
  @IsOptional()
  @IsUUID()
  incomeCategoryId?: string | null;

  @ApiPropertyOptional({
    example: '3f2b9c1e-7d4a-4b8e-9f10-2a6c5d8e1b47',
    format: 'uuid',
    nullable: true,
    description:
      'Expense category for an EXPENSE transaction. Must be omitted or null for INCOME transactions.',
  })
  @IsOptional()
  @IsUUID()
  expenseCategoryId?: string | null;
}
