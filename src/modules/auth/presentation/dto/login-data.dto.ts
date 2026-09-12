import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from '../../../users/presentation/dto/user-response.dto';

export class LoginDataDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token.',
  })
  accessToken!: string;

  @ApiProperty({
    type: UserResponseDto,
    description: 'Authenticated user.',
  })
  user!: UserResponseDto;
}
