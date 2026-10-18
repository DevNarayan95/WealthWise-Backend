import { Injectable, Logger } from '@nestjs/common';

import { AuthEmailService } from './auth-email.service';
import { OtpService } from './otp.service';
import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { PasswordHasherService } from '../../../../infrastructure/security/password-hasher.service';
import { EmailDeliveryFailedException } from '../../../../infrastructure/mail/email-delivery-failed.exception';
import {
  OtpInvalidException,
  OtpResendTooSoonException,
} from '../../presentation/exceptions/otp.exceptions';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly otpService: OtpService,
    private readonly authEmailService: AuthEmailService,
    private readonly passwordHasher: PasswordHasherService,
  ) {}

  /**
   * Always resolves the same way, so callers cannot tell whether an email has an
   * account, whether a code was just sent, or whether delivery worked.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      return;
    }

    try {
      await this.authEmailService.sendOtp(
        user.id,
        { email: user.email, firstName: user.firstName },
        'PASSWORD_RESET',
      );
    } catch (error) {
      if (error instanceof OtpResendTooSoonException) {
        return;
      }

      if (error instanceof EmailDeliveryFailedException) {
        this.logger.warn('Password reset email could not be delivered');
        return;
      }

      throw error;
    }
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new OtpInvalidException();
    }

    await this.otpService.verify(user.id, 'PASSWORD_RESET', code);

    const passwordHash = await this.passwordHasher.hash(newPassword);
    await this.userRepository.updatePasswordHash(user.id, passwordHash);

    if (!user.isEmailVerified) {
      await this.userRepository.markEmailVerified(user.id, new Date());
    }
  }
}
