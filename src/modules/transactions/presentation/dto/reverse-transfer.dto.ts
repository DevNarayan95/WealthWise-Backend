import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ReverseTransferDto {
  @ApiProperty({
    example: '2026-09-02',
    format: 'date',
    description:
      'Calendar date (YYYY-MM-DD) in the user local date when the reversal occurred.',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'transactionDate must use the YYYY-MM-DD format',
  })
  transactionDate!: string;

  @ApiPropertyOptional({
    example: 'Undo transfer',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;
}
