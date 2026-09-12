import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { LoginInput } from '../../application/inputs/login.input';
import { AuthService } from '../../application/services/auth.service';

import { LoginDto } from '../dto/login.dto';

import { UserResponseMapper } from '../../../users/presentation/mappers/user-response.mapper';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginResponseDto } from '../dto/login-response.dto';

import { UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('Authentication')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000, // 1 minute in milliseconds
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate a user',
    description:
      'Authenticates a user using email and password and returns a JWT access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful.',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data.',
  })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
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
      meta: {},
    };
  }
}
