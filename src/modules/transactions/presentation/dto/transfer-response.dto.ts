import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionResponseDto } from './transaction-response.dto';

export class TransferLegResponseDto extends TransactionResponseDto {
  @ApiProperty({
    example: '6f1c2a8e-3b4d-4c5e-8f9a-0b1c2d3e4f50',
    format: 'uuid',
    description: 'Shared by both legs of a transfer and its reversal pair.',
  })
  transferGroupId!: string;

  @ApiPropertyOptional({
    example: '20.00000000',
    nullable: true,
    description:
      'Exchange rate from the source currency to the destination currency for the transfer date.',
  })
  transferExchangeRate!: string | null;

  @ApiPropertyOptional({
    example: 'PROVIDER',
    nullable: true,
    description: 'Where the transfer exchange rate came from.',
  })
  transferRateSource!: string | null;
}

export class TransferResponseDto {
  @ApiProperty({
    example: '6f1c2a8e-3b4d-4c5e-8f9a-0b1c2d3e4f50',
    format: 'uuid',
  })
  transferGroupId!: string;

  @ApiProperty({
    description: 'Leg that debits the source account.',
    type: TransferLegResponseDto,
  })
  outLeg!: TransferLegResponseDto;

  @ApiProperty({
    description: 'Leg that credits the destination account.',
    type: TransferLegResponseDto,
  })
  inLeg!: TransferLegResponseDto;
}
