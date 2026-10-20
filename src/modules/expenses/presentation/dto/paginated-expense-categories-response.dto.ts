import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaDto } from '../../../../common/pagination/pagination-meta.dto';
import { ExpenseCategoryResponseDto } from './expense-category-response.dto';

export class PaginatedExpenseCategoriesDataDto {
  @ApiProperty({
    type: [ExpenseCategoryResponseDto],
  })
  items!: ExpenseCategoryResponseDto[];
}

export class PaginatedExpenseCategoriesResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({
    type: PaginatedExpenseCategoriesDataDto,
  })
  data!: PaginatedExpenseCategoriesDataDto;

  @ApiProperty({
    type: PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}
