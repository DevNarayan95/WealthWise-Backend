import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../domain/entities/transaction.entity';

export class TransactionResponseDto {
  @ApiProperty({
    example: '8a6f0c8d-5f65-4e6e-8c9e-9d1e5e6b8a12',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    example: 'b7c4a3d2-7e9f-4f3b-8e6a-1d2c3b4a5e6f',
    format: 'uuid',
  })
  accountId!: string;

  @ApiProperty({
    enum: TransactionType,
    example: TransactionType.EXPENSE,
  })
  type!: TransactionType;

  @ApiProperty({
    example: '50.00',
  })
  amount!: string;

  @ApiProperty({
    example: 'MYR',
  })
  currency!: string;

  @ApiPropertyOptional({
    example: 'Lunch',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    example: '2026-09-01',
    format: 'date',
    description:
      'Calendar date (YYYY-MM-DD) of the transaction in the user local date.',
  })
  transactionDate!: string;

  @ApiPropertyOptional({
    example: '8a6f0c8d-5f65-4e6e-8c9e-9d1e5e6b8a12',
    format: 'uuid',
    nullable: true,
    description:
      'ID of the original transaction when this transaction is a reversal.',
  })
  reversalOfTransactionId!: string | null;

  @ApiPropertyOptional({
    example: '8a6f0c8d-5f65-4e6e-8c9e-9d1e5e6b8a12',
    format: 'uuid',
    nullable: true,
    description:
      'ID of the income category linked to this income transaction. Null for expenses and uncategorized income.',
  })
  incomeCategoryId!: string | null;

  @ApiPropertyOptional({
    example: '8a6f0c8d-5f65-4e6e-8c9e-9d1e5e6b8a12',
    format: 'uuid',
    nullable: true,
    description:
      'ID of the expense category linked to this expense transaction. Null for income and uncategorized expenses.',
  })
  expenseCategoryId!: string | null;

  @ApiProperty({
    example: 'INR',
    description: 'Base currency used for reporting and net worth.',
  })
  baseCurrency!: string;

  @ApiProperty({
    example: '4550.0000',
    description:
      'Amount converted to the base currency, using the exchange rate for the transaction date.',
  })
  baseAmount!: string;

  @ApiProperty({
    example: '23.50000000',
    description: 'Rate applied to convert the amount into the base currency.',
  })
  exchangeRate!: string;

  @ApiProperty({
    example: '2026-09-01',
    format: 'date',
    description: 'Date of the exchange rate that was applied.',
  })
  rateDate!: string;

  @ApiProperty({
    enum: ['IDENTITY', 'PROVIDER', 'FALLBACK', 'MANUAL'],
    example: 'PROVIDER',
    description:
      'Where the exchange rate came from. FALLBACK uses the most recent stored rate; MANUAL uses the configured rate.',
  })
  rateSource!: string;

  @ApiProperty({
    example: '2026-09-01T00:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-09-01T00:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: Date;
}
