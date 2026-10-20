import { ApiProperty } from '@nestjs/swagger';

export class IncomeCategoryResponseDto {
  @ApiProperty({
    example: '8a6f0c8d-5f65-4e6e-8c9e-9d1e5e6b8a12',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ example: 'Salary' })
  name!: string;

  @ApiProperty({
    example: true,
    description:
      'True for system categories shared by all users. System categories are read-only.',
  })
  isSystem!: boolean;

  @ApiProperty({
    example: false,
    description:
      'True when the category has been archived. Archived categories are hidden from lists and cannot be used for new transactions.',
  })
  isArchived!: boolean;

  @ApiProperty({
    example: '2026-09-01T00:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-09-01T00:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: Date;
}
