import { ApiProperty } from '@nestjs/swagger';
import { TransferResponseDto } from './transfer-response.dto';

export class TransferResponseEnvelopeDto {
  @ApiProperty({
    example: true,
  })
  success!: true;

  @ApiProperty({
    type: TransferResponseDto,
  })
  data!: TransferResponseDto;

  @ApiProperty({
    example: {},
  })
  meta!: Record<string, unknown>;
}
