import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({
    description:
      'Account the money leaves. Must belong to the authenticated user.',
    example: 'b7c4a3d2-7e9f-4f3b-8e6a-1d2c3b4a5e6f',
    format: 'uuid',
  })
  @IsUUID()
  sourceAccountId!: string;

  @ApiProperty({
    description:
      'Account the money arrives in. Must belong to the authenticated user and differ from the source.',
    example: 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
    format: 'uuid',
  })
  @IsUUID()
  destinationAccountId!: string;

  @ApiProperty({
    description:
      'Amount in the source account currency. The destination amount is converted with the exchange rate for transactionDate.',
    example: '50.00',
  })
  @IsString()
  @Matches(/^(?=.*[1-9])\d{1,15}(?:\.\d{1,4})?$/)
  amount!: string;

  @ApiProperty({
    example: '2026-09-01',
    format: 'date',
    description:
      'Calendar date (YYYY-MM-DD) in the user local date. Also the date used for the exchange rate.',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'transactionDate must use the YYYY-MM-DD format',
  })
  transactionDate!: string;

  @ApiPropertyOptional({
    example: 'Savings top-up',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;
}
