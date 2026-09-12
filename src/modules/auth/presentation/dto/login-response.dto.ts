import { ApiProperty } from '@nestjs/swagger';
import { LoginDataDto } from './login-data.dto';

export class LoginResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indicates whether the request was successful.',
  })
  success!: true;

  @ApiProperty({
    type: LoginDataDto,
    description: 'Authentication result.',
  })
  data!: LoginDataDto;

  @ApiProperty({
    example: {},
    description: 'Additional response metadata.',
    type: Object,
  })
  meta!: Record<string, unknown>;
}
