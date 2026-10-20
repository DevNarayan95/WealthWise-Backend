import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaDto } from '../../../../common/pagination/pagination-meta.dto';
import { AccountResponseDto } from './account-response.dto';

export class PaginatedAccountsDataDto {
  @ApiProperty({
    type: [AccountResponseDto],
  })
  items!: AccountResponseDto[];
}

export class PaginatedAccountsResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({
    type: PaginatedAccountsDataDto,
  })
  data!: PaginatedAccountsDataDto;

  @ApiProperty({
    type: PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}
