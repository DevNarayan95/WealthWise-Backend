import { ApiProperty } from '@nestjs/swagger';

export class MessageDataDto {
  @ApiProperty({
    example: 'If the account exists, a code has been sent.',
    description: 'Human-readable outcome of the request.',
  })
  message!: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: MessageDataDto })
  data!: MessageDataDto;

  @ApiProperty({ example: {}, type: Object })
  meta!: Record<string, unknown>;
}
