import { ApiProperty } from '@nestjs/swagger';
import { TransactionResponseDto } from './transaction-response.dto';
import { TransactionListMetaDto } from './transaction-list-meta.dto';

export class TransactionListResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({
    type: [TransactionResponseDto],
  })
  data!: TransactionResponseDto[];

  @ApiProperty({
    type: TransactionListMetaDto,
  })
  meta!: TransactionListMetaDto;
}
