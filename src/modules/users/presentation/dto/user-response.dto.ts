import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    example: '7f5d9c7e-6f1c-4e2b-8a3e-123456789abc',
    description: 'Unique user identifier.',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    example: 'admin@wealthwise.local',
    description: 'User email address.',
    format: 'email',
  })
  email!: string;

  @ApiProperty({
    example: 'System',
    description: 'User first name.',
  })
  firstName!: string;

  @ApiProperty({
    example: 'Administrator',
    description: 'User last name.',
  })
  lastName!: string;

  @ApiProperty({
    example: '2026-08-06T10:00:00.000Z',
    description: 'User creation timestamp.',
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-08-06T10:00:00.000Z',
    description: 'Last user update timestamp.',
    format: 'date-time',
  })
  updatedAt!: Date;
}
