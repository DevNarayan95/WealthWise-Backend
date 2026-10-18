import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { PinoLogger } from 'nestjs-pino';

import type { AppConfig } from '../../config/app-config';
import { SmtpMailSender } from './smtp-mail-sender';
import { EmailDeliveryFailedException } from './email-delivery-failed.exception';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('SmtpMailSender', () => {
  const sendMail = jest.fn();
  const createTransportMock = createTransport as unknown as jest.Mock;
  const logger = {
    setContext: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };

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
    logger.setContext.mockReset();
    logger.debug.mockReset();
    logger.error.mockReset();
    createTransportMock.mockReturnValue({ sendMail });
  });

  const buildSender = (
    secrets: Partial<AppConfig['secrets']> = {},
  ): SmtpMailSender =>
    new SmtpMailSender(buildConfig(secrets), logger as unknown as PinoLogger);

  it('creates a transport from the configured SMTP host without credentials when none are set', () => {
    buildSender();

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      connectionTimeout: 5000,
      auth: undefined,
    });
  });

  it('passes SMTP credentials from secrets to the transport', () => {
    buildSender({ smtpUsername: 'mailer', smtpPassword: 'pw-secret' });

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { user: 'mailer', pass: 'pw-secret' },
      }),
    );
  });

  it('sets the logger context to the sender class name', () => {
    buildSender();

    expect(logger.setContext).toHaveBeenCalledWith('SmtpMailSender');
  });

  it('sends the message from the configured sender address', async () => {
    sendMail.mockResolvedValue({ messageId: 'id-1' });
    const sender = buildSender();

    await sender.send(message);

    expect(sendMail).toHaveBeenCalledWith({
      from: 'WealthWise <no-reply@wealthwise.local>',
      to: 'john@example.com',
      subject: 'Subject',
      text: 'Body text',
      html: '<p>Body</p>',
    });
  });

  it('logs the start and success of a notification with duration and no recipient', async () => {
    sendMail.mockResolvedValue({ messageId: 'id-1' });
    const sender = buildSender();

    await sender.send(message);

    expect(logger.debug).toHaveBeenCalledWith(
      { channel: 'email' },
      'Notification send started',
    );
    expect(logger.debug).toHaveBeenCalledWith(
      { channel: 'email', durationMs: expect.any(Number) },
      'Notification sent',
    );
    expect(JSON.stringify(logger.debug.mock.calls)).not.toContain(
      'john@example.com',
    );
  });

  it('wraps transport failures in EmailDeliveryFailedException without leaking the body', async () => {
    sendMail.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const sender = buildSender();

    const error = await sender.send(message).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(EmailDeliveryFailedException);
    expect(JSON.stringify(error)).not.toContain('Body text');
  });

  it('logs the failure with the error code and never the recipient or body', async () => {
    sendMail.mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED'), {
        code: 'ECONNREFUSED',
      }),
    );
    const sender = buildSender();

    await sender.send(message).catch(() => undefined);

    expect(logger.error).toHaveBeenCalledWith(
      {
        channel: 'email',
        durationMs: expect.any(Number),
        errorCode: 'ECONNREFUSED',
      },
      'Notification delivery failed',
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
      'john@example.com',
    );
  });

  it('logs UNKNOWN as the error code when the transport error has no code', async () => {
    sendMail.mockRejectedValue(new Error('boom'));
    const sender = buildSender();

    await sender.send(message).catch(() => undefined);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'UNKNOWN' }),
      'Notification delivery failed',
    );
  });
});
