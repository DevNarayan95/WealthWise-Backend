import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { PasswordHasherService } from '../../../../infrastructure/security/password-hasher.service';
import { EmailNotVerifiedException } from '../../presentation/exceptions/email-not-verified.exception';
import { AuthSessionService } from './auth-session.service';

import { LoginInput } from '../inputs/login.input';
import { LoginOutput } from '../outputs/login.output';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly authSessionService: AuthSessionService,
    private readonly configService: ConfigService,
  ) {}

  async login(input: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await this.passwordHasher.verify(
      input.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    const verificationRequired = this.configService.getOrThrow<boolean>(
      'registration.emailVerificationRequired',
    );

    if (verificationRequired && !user.isEmailVerified) {
      throw new EmailNotVerifiedException();
    }

    const tokens = await this.authSessionService.openSession(user);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
