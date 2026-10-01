import { ApiProperty } from '@nestjs/swagger';
import { TransactionResponseDto } from './transaction-response.dto';

export class TransactionResponseEnvelopeDto {
  @ApiProperty({
    example: true,
  })
  success!: true;

  @ApiProperty({
    type: TransactionResponseDto,
  })
  data!: TransactionResponseDto;

  @ApiProperty({
    example: {},
  })
  meta!: Record<string, unknown>;
}
