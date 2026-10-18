import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthEmailService } from './auth-email.service';
import { OtpService } from './otp.service';
import { UsersService } from '../../../users/application/services/users.service';
import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { User } from '../../../users/domain/entities/user.entity';
import { OtpInvalidException } from '../../presentation/exceptions/otp.exceptions';

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterOutput {
  user: User;
  verificationRequired: boolean;
}

@Injectable()
export class RegistrationService {
  private readonly verificationRequired: boolean;

  constructor(
    private readonly usersService: UsersService,
    private readonly userRepository: UserRepository,
    private readonly otpService: OtpService,
    private readonly authEmailService: AuthEmailService,
    configService: ConfigService,
  ) {
    this.verificationRequired = configService.getOrThrow<boolean>(
      'registration.emailVerificationRequired',
    );
  }

  async register(input: RegisterInput): Promise<RegisterOutput> {
    const user = await this.usersService.create({
      ...input,
      emailVerified: !this.verificationRequired,
    });

    const recipient = { email: user.email, firstName: user.firstName };

    if (!this.verificationRequired) {
      await this.authEmailService.sendWelcome(recipient);

      return { user, verificationRequired: false };
    }

    await this.authEmailService.sendOtp(
      user.id,
      recipient,
      'EMAIL_VERIFICATION',
    );

    return { user, verificationRequired: true };
  }

  /**
   * Unknown and already-verified emails are not distinguished from a wrong code,
   * so the response does not reveal which addresses have accounts.
   */
  async verifyEmail(email: string, code: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new OtpInvalidException();
    }

    if (user.isEmailVerified) {
      return;
    }

    await this.otpService.verify(user.id, 'EMAIL_VERIFICATION', code);
    await this.userRepository.markEmailVerified(user.id, new Date());

    await this.authEmailService.sendWelcome({
      email: user.email,
      firstName: user.firstName,
    });
  }

  /** Silently does nothing for unknown or verified emails. */
  async resendVerification(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user || user.isEmailVerified) {
      return;
    }

    await this.authEmailService.sendOtp(
      user.id,
      { email: user.email, firstName: user.firstName },
      'EMAIL_VERIFICATION',
    );
  }
}
