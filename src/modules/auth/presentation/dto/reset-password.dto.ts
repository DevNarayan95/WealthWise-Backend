import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'john.doe@wealthwise.local',
    description: 'Email address of the account.',
    format: 'email',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'Numeric one-time code sent by email for password reset.',
    minLength: 4,
    maxLength: 10,
  })
  @IsString()
  @Matches(/^\d+$/)
  @MinLength(4)
  @MaxLength(10)
  code!: string;

  @ApiProperty({
    example: 'NewPassword@123',
    description: 'New account password.',
    minLength: 8,
    maxLength: 100,
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  newPassword!: string;
}
