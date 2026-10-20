import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaDto } from '../../../../common/pagination/pagination-meta.dto';
import { TransactionResponseDto } from './transaction-response.dto';

export class TransactionListDataDto {
  @ApiProperty({
    type: [TransactionResponseDto],
  })
  items!: TransactionResponseDto[];
}

export class TransactionListResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({
    type: TransactionListDataDto,
  })
  data!: TransactionListDataDto;

  @ApiProperty({
    type: PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}
