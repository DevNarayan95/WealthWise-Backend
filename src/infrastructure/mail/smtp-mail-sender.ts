import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { PinoLogger } from 'nestjs-pino';

import type { AppConfig } from '../../config/app-config';
import { EmailDeliveryFailedException } from './email-delivery-failed.exception';
import type { MailMessage } from './mail-sender';
import { MailSender } from './mail-sender';

@Injectable()
export class SmtpMailSender extends MailSender {
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly logger: PinoLogger,
  ) {
    super();
    this.logger.setContext(SmtpMailSender.name);
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
    const startedAt = Date.now();
    this.logger.debug({ channel: 'email' }, 'Notification send started');

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      this.logger.debug(
        { channel: 'email', durationMs: Date.now() - startedAt },
        'Notification sent',
      );
    } catch (error: unknown) {
      // Log only the error class and code. Never log recipients or bodies.
      const code = (error as { code?: string })?.code ?? 'UNKNOWN';
      this.logger.error(
        {
          channel: 'email',
          durationMs: Date.now() - startedAt,
          errorCode: code,
        },
        'Notification delivery failed',
      );
      throw new EmailDeliveryFailedException();
    }
  }
}
