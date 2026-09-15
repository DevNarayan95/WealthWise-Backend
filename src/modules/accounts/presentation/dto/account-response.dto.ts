import { ApiProperty } from '@nestjs/swagger';

import {
  AccountStatus,
  AccountType,
} from '../../domain/entities/account.entity';

export class AccountResponseDto {
  @ApiProperty({
    example: '7d7c6f6e-9b13-4c68-a6b5-123456789abc',
  })
  id!: string;

  @ApiProperty({
    example: 'Maybank Savings',
  })
  name!: string;

  @ApiProperty({
    enum: AccountType,
    example: AccountType.BANK_ACCOUNT,
  })
  type!: AccountType;

  @ApiProperty({
    example: 'MYR',
  })
  currency!: string;

  @ApiProperty({
    example: '1250.5000',
    description:
      'Opening balance represented as a decimal string to preserve financial precision.',
  })
  openingBalance!: string;

  @ApiProperty({
    enum: AccountStatus,
    example: AccountStatus.ACTIVE,
  })
  status!: AccountStatus;

  @ApiProperty({
    example: '2026-08-01T00:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-08-01T00:00:00.000Z',
  })
  updatedAt!: Date;
}
