import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'john.doe@wealthwise.local',
    description: 'Email address that received the verification code.',
    format: 'email',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'Numeric one-time code sent by email.',
    minLength: 4,
    maxLength: 10,
  })
  @IsString()
  @Matches(/^\d+$/)
  @MinLength(4)
  @MaxLength(10)
  code!: string;
}
