import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

import { PAGINATION } from '../../../../common/pagination/pagination-config';

export class ListExpenseCategoriesQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION.maxPageSize)
  limit = PAGINATION.defaultPageSize;
}
