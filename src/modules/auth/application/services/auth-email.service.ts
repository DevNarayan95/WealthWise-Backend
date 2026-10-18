import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OtpService } from './otp.service';
import { EmailOtpPurpose } from '../../domain/repositories/email-otp.repository';
import { MailSender } from '../../../../infrastructure/mail/mail-sender';
import {
  buildOtpEmail,
  buildWelcomeEmail,
} from '../../../../infrastructure/mail/mail-templates';

export interface EmailRecipient {
  email: string;
  firstName: string;
}

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);
  private readonly appName: string;
  private readonly expiresInMinutes: number;

  constructor(
    private readonly otpService: OtpService,
    private readonly mailSender: MailSender,
    configService: ConfigService,
  ) {
    this.appName = configService.getOrThrow<string>('app.name');
    this.expiresInMinutes =
      configService.getOrThrow<number>('otp.expiresInSeconds') / 60;
  }

  /** Issues a code and emails it. Cooldown and delivery errors propagate to the caller. */
  async sendOtp(
    userId: string,
    recipient: EmailRecipient,
    purpose: EmailOtpPurpose,
  ): Promise<void> {
    const code = await this.otpService.issue(userId, purpose);

    const email = buildOtpEmail({
      appName: this.appName,
      firstName: recipient.firstName,
      code,
      kind: purpose,
      expiresInMinutes: this.expiresInMinutes,
    });

    await this.mailSender.send({
      to: recipient.email,
      ...email,
    });
  }

  /** Best-effort: a failed welcome email must not roll back a successful verification. */
  async sendWelcome(recipient: EmailRecipient): Promise<void> {
    const email = buildWelcomeEmail({
      appName: this.appName,
      firstName: recipient.firstName,
    });

    try {
      await this.mailSender.send({
        to: recipient.email,
        ...email,
      });
    } catch {
      this.logger.warn('Welcome email could not be delivered');
    }
  }
}
