import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReverseTransactionDto {
  @ApiProperty({
    example: '2026-09-21T00:00:00.000Z',
    description: 'Date and time when the reversal financial event occurred.',
  })
  @IsDateString()
  transactionDate!: string;

  @ApiPropertyOptional({
    example: 'Salary reversal',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;
}
