import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { AccountType } from '../../domain/entities/account.entity';

export class CreateAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Za-z]{3}$/)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  currency!: string;

  @IsString()
  @Matches(/^-?\d{1,15}(?:\.\d{1,4})?$/)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  openingBalance!: string;
}
