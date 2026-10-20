import { ApiProperty } from '@nestjs/swagger';

export class TokenDataDto {
  @ApiProperty({
    example: '******',
    description:
      'Short-lived JWT access token. Send it as Authorization: Bearer <token>.',
  })
  accessToken!: string;

  @ApiProperty({
    example: '******',
    description:
      'Single-use refresh token. Replace the stored value with this one after every refresh.',
  })
  refreshToken!: string;
}

export class TokenResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: TokenDataDto })
  data!: TokenDataDto;

  @ApiProperty({ example: {}, type: Object })
  meta!: Record<string, unknown>;
}
