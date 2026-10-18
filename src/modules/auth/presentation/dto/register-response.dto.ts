import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from '../../../users/presentation/dto/user-response.dto';

export class RegisterDataDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty({
    example: true,
    description:
      'True when the user must verify the email address before logging in.',
  })
  verificationRequired!: boolean;
}

export class RegisterResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: RegisterDataDto })
  data!: RegisterDataDto;

  @ApiProperty({ example: {}, type: Object })
  meta!: Record<string, unknown>;
}
