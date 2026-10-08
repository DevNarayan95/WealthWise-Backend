import { ApiProperty } from '@nestjs/swagger';

export class AccountBalanceResponseDto {
  @ApiProperty({
    description: 'Account UUID.',
    example: '7d7c6f6e-9b13-4c68-a6b5-123456789abc',
    format: 'uuid',
  })
  accountId!: string;

  @ApiProperty({
    description: 'ISO 4217 account currency code.',
    example: 'MYR',
  })
  currency!: string;

  @ApiProperty({
    description:
      'Current account balance represented as an exact decimal string.',
    example: '1300.0000',
  })
  balance!: string;
}
