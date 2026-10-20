import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaDto } from '../../../../common/pagination/pagination-meta.dto';
import { IncomeCategoryResponseDto } from './income-category-response.dto';

export class PaginatedIncomeCategoriesDataDto {
  @ApiProperty({
    type: [IncomeCategoryResponseDto],
  })
  items!: IncomeCategoryResponseDto[];
}

export class PaginatedIncomeCategoriesResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({
    type: PaginatedIncomeCategoriesDataDto,
  })
  data!: PaginatedIncomeCategoriesDataDto;

  @ApiProperty({
    type: PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}
