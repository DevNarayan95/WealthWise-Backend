import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

import type { AppConfig } from '../../config/app-config';
import { SmtpMailSender } from './smtp-mail-sender';
import { EmailDeliveryFailedException } from './email-delivery-failed.exception';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('SmtpMailSender', () => {
  const sendMail = jest.fn();
  const createTransportMock = createTransport as unknown as jest.Mock;

  const buildConfig = (
    secrets: Partial<AppConfig['secrets']> = {},
  ): ConfigService<AppConfig, true> => {
    const values: Record<string, unknown> = {
      mail: {
        fromAddress: 'WealthWise <no-reply@wealthwise.local>',
        smtp: {
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          connectionTimeoutMs: 5000,
        },
      },
      secrets: {
        jwtSecret: 'x'.repeat(32),
        databaseUrl: 'postgresql://localhost/test',
        ...secrets,
      },
    };

    return {
      getOrThrow: jest.fn((path: string) => values[path]),
    } as unknown as ConfigService<AppConfig, true>;
  };

  const message = {
    to: 'john@example.com',
    subject: 'Subject',
    text: 'Body text',
    html: '<p>Body</p>',
  };

  beforeEach(() => {
    sendMail.mockReset();
    createTransportMock.mockReset();
    createTransportMock.mockReturnValue({ sendMail });
  });

  it('creates a transport from the configured SMTP host without credentials when none are set', () => {
    new SmtpMailSender(buildConfig());

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      connectionTimeout: 5000,
      auth: undefined,
    });
  });

  it('passes SMTP credentials from secrets to the transport', () => {
    new SmtpMailSender(
      buildConfig({ smtpUsername: 'mailer', smtpPassword: 'pw-secret' }),
    );

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { user: 'mailer', pass: 'pw-secret' },
      }),
    );
  });

  it('sends the message from the configured sender address', async () => {
    sendMail.mockResolvedValue({ messageId: 'id-1' });
    const sender = new SmtpMailSender(buildConfig());

    await sender.send(message);

    expect(sendMail).toHaveBeenCalledWith({
      from: 'WealthWise <no-reply@wealthwise.local>',
      to: 'john@example.com',
      subject: 'Subject',
      text: 'Body text',
      html: '<p>Body</p>',
    });
  });

  it('wraps transport failures in EmailDeliveryFailedException without leaking the body', async () => {
    sendMail.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const sender = new SmtpMailSender(buildConfig());

    const error = await sender.send(message).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(EmailDeliveryFailedException);
    expect(JSON.stringify(error)).not.toContain('Body text');
  });
});
