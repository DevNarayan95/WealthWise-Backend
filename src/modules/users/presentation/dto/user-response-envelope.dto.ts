import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from './user-response.dto';

export class UserResponseEnvelopeDto {
  @ApiProperty({
    example: true,
    description: 'Indicates whether the request was successful.',
  })
  success!: true;

  @ApiProperty({
    type: UserResponseDto,
    description: 'User information.',
  })
  data!: UserResponseDto;

  @ApiProperty({
    example: {},
    description: 'Additional response metadata.',
    type: Object,
  })
  meta!: Record<string, unknown>;
}
