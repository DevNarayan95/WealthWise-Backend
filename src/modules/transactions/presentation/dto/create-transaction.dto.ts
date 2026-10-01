import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../domain/entities/transaction.entity';
import {
  IsDateString,
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
    example: '2026-09-01T00:00:00.000Z',
    description: 'Date and time when the financial transaction occurred.',
  })
  @IsDateString()
  transactionDate!: string;
}
