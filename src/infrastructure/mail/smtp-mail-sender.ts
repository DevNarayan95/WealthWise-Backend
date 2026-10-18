import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

import type { AppConfig } from '../../config/app-config';
import { EmailDeliveryFailedException } from './email-delivery-failed.exception';
import type { MailMessage } from './mail-sender';
import { MailSender } from './mail-sender';

@Injectable()
export class SmtpMailSender extends MailSender {
  private readonly logger = new Logger(SmtpMailSender.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(config: ConfigService<AppConfig, true>) {
    super();
    const mail = config.getOrThrow<AppConfig['mail']>('mail');
    const secrets = config.getOrThrow<AppConfig['secrets']>('secrets');

    this.fromAddress = mail.fromAddress;
    this.transporter = createTransport({
      host: mail.smtp.host,
      port: mail.smtp.port,
      secure: mail.smtp.secure,
      connectionTimeout: mail.smtp.connectionTimeoutMs,
      auth:
        secrets.smtpUsername && secrets.smtpPassword
          ? { user: secrets.smtpUsername, pass: secrets.smtpPassword }
          : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    } catch (error: unknown) {
      // Log only the error class and code. Never log recipients or bodies.
      const code = (error as { code?: string })?.code ?? 'UNKNOWN';
      this.logger.error(`SMTP delivery failed (code: ${code})`);
      throw new EmailDeliveryFailedException();
    }
  }
}
