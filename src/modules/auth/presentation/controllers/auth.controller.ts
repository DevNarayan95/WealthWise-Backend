import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { LoginInput } from '../../application/inputs/login.input';
import { AuthService } from '../../application/services/auth.service';
import { RegistrationService } from '../../application/services/registration.service';
import { PasswordResetService } from '../../application/services/password-reset.service';

import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { EmailDto } from '../dto/email.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { MessageResponseDto } from '../dto/message-response.dto';
import { RegisterResponseDto } from '../dto/register-response.dto';

import { UserResponseMapper } from '../../../users/presentation/mappers/user-response.mapper';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RequiresApiKey } from '../../../../common/decorators/api-security.decorator';
import { LoginResponseDto } from '../dto/login-response.dto';

import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { readAppConfigFile } from '../../../../config/app-config';

const throttleConfig = readAppConfigFile().security.throttle;

const loginThrottle = {
  default: {
    limit: throttleConfig.loginLimit,
    ttl: throttleConfig.ttlMs,
  },
};

const sensitiveThrottle = {
  default: {
    limit: throttleConfig.sensitiveLimit,
    ttl: throttleConfig.ttlMs,
  },
};

@ApiTags('Authentication')
@RequiresApiKey()
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly registrationService: RegistrationService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle(loginThrottle)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate a user',
    description:
      'Authenticates a user using email and password and returns a JWT access token. Accounts whose email is not verified are refused with EMAIL_NOT_VERIFIED when verification is required.',
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
    status: 403,
    description: 'Email address not verified (EMAIL_NOT_VERIFIED).',
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

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle(sensitiveThrottle)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates an account. When email verification is required, a one-time code is emailed and login is refused until the address is verified.',
  })
  @ApiResponse({
    status: 201,
    description: 'Account created.',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data.',
  })
  @ApiResponse({
    status: 409,
    description:
      'An account with this email already exists (USER_ALREADY_EXISTS).',
  })
  @ApiResponse({
    status: 503,
    description:
      'The verification email could not be delivered (EMAIL_DELIVERY_FAILED). The account exists; use resend-verification.',
  })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    const result = await this.registrationService.register({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    return {
      success: true,
      data: {
        user: UserResponseMapper.toDto(result.user),
        verificationRequired: result.verificationRequired,
      },
      meta: {},
    };
  }

  @Post('verify-email')
  @UseGuards(ThrottlerGuard)
  @Throttle(sensitiveThrottle)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify an email address with the emailed code',
    description:
      'Marks the email as verified and sends the welcome email. Unknown emails and wrong codes both return OTP_INVALID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified.',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Code is invalid (OTP_INVALID) or expired (OTP_EXPIRED).',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many wrong attempts (OTP_ATTEMPTS_EXCEEDED).',
  })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<MessageResponseDto> {
    await this.registrationService.verifyEmail(dto.email, dto.code);

    return this.message('Email verified successfully.');
  }

  @Post('resend-verification')
  @UseGuards(ThrottlerGuard)
  @Throttle(sensitiveThrottle)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Resend the email verification code',
    description:
      'Sends a new verification code if the account exists and is not yet verified.',
  })
  @ApiResponse({
    status: 202,
    description: 'Request accepted.',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'A code was requested too recently (OTP_RESEND_TOO_SOON).',
  })
  async resendVerification(@Body() dto: EmailDto): Promise<MessageResponseDto> {
    await this.registrationService.resendVerification(dto.email);

    return this.message(
      'If the account exists and is not verified, a new code has been sent.',
    );
  }

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @Throttle(sensitiveThrottle)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request a password reset code',
    description:
      'Emails a reset code if the account exists. The response is the same whether or not the account exists.',
  })
  @ApiResponse({
    status: 202,
    description: 'Request accepted.',
    type: MessageResponseDto,
  })
  async forgotPassword(@Body() dto: EmailDto): Promise<MessageResponseDto> {
    await this.passwordResetService.forgotPassword(dto.email);

    return this.message(
      'If the account exists, a password reset code has been sent.',
    );
  }

  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  @Throttle(sensitiveThrottle)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset a password with the emailed code',
    description:
      'Sets a new password after the reset code is verified. A successful reset also marks the email as verified.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset.',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Code is invalid (OTP_INVALID) or expired (OTP_EXPIRED).',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many wrong attempts (OTP_ATTEMPTS_EXCEEDED).',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    await this.passwordResetService.resetPassword(
      dto.email,
      dto.code,
      dto.newPassword,
    );

    return this.message('Password has been reset successfully.');
  }

  private message(message: string): MessageResponseDto {
    return {
      success: true,
      data: { message },
      meta: {},
    };
  }
}
