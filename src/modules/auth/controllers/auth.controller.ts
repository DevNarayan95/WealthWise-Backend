import { Body, Controller, Post } from '@nestjs/common';

import { LoginDto } from '../dto/login.dto';
import { AuthService } from '../services/auth.service';
import { UserResponseMapper } from '../../users/mappers/user-response.mapper';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        user: UserResponseMapper.toDto(result.user),
      },
    };
  }
}
