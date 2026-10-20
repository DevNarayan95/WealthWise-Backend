import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from '../../../users/presentation/dto/user-response.dto';

export class LoginDataDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'Short-lived JWT access token. Send it as Authorization: Bearer <token>.',
  })
  accessToken!: string;

  @ApiProperty({
    example: '******',
    description:
      'Single-use refresh token. Exchange it at POST /auth/refresh before the access token expires.',
  })
  refreshToken!: string;

  @ApiProperty({
    type: UserResponseDto,
    description: 'Authenticated user.',
  })
  user!: UserResponseDto;
}
