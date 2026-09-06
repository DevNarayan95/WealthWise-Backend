import { Body, Controller, Post } from '@nestjs/common';

import { LoginInput } from '../../application/inputs/login.input';
import { AuthService } from '../../application/services/auth.service';

import { LoginDto } from '../dto/login.dto';

import { UserResponseMapper } from '../../../users/presentation/mappers/user-response.mapper';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const input: LoginInput = {
      email: dto.email,
      password: dto.password,
    };

    const result = await this.authService.login(input);

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        user: UserResponseMapper.toDto(result.user),
      },
    };
  }
}
