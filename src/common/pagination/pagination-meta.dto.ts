import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Current page number.' })
  page!: number;

  @ApiProperty({ example: 20, description: 'Items per page.' })
  limit!: number;

  @ApiProperty({ example: 42, description: 'Total number of items.' })
  total!: number;

  @ApiProperty({ example: 3, description: 'Total number of pages.' })
  totalPages!: number;

  @ApiProperty({ example: true, description: 'Whether a next page exists.' })
  hasNextPage!: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether a previous page exists.',
  })
  hasPreviousPage!: boolean;
}
