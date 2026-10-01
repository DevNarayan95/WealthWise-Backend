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
    example: '2026-09-01T00:00:00.000Z',
  })
  transactionDate!: Date;

  @ApiProperty({
    example: '2026-09-01T10:15:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-09-01T10:15:00.000Z',
  })
  updatedAt!: Date;
}
