import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { AuthEmailService } from './auth-email.service';
import { OtpService } from './otp.service';
import { MailSender } from '../../../../infrastructure/mail/mail-sender';
import { EmailDeliveryFailedException } from '../../../../infrastructure/mail/email-delivery-failed.exception';
import { OtpResendTooSoonException } from '../../presentation/exceptions/otp.exceptions';

describe('AuthEmailService', () => {
  let service: AuthEmailService;
  let otpService: jest.Mocked<Pick<OtpService, 'issue'>>;
  let mailSender: jest.Mocked<MailSender>;

  const recipient = { email: 'jane@example.com', firstName: 'Jane' };

  beforeEach(async () => {
    otpService = { issue: jest.fn().mockResolvedValue('123456') };
    mailSender = { send: jest.fn().mockResolvedValue(undefined) } as any;

    const configValues: Record<string, unknown> = {
      'app.name': 'WealthWise Backend',
      'otp.expiresInSeconds': 600,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthEmailService,
        { provide: OtpService, useValue: otpService },
        { provide: MailSender, useValue: mailSender },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => configValues[key]),
          },
        },
      ],
    }).compile();

    service = module.get(AuthEmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOtp', () => {
    it('issues a code and emails it to the recipient', async () => {
      await service.sendOtp('user-id', recipient, 'EMAIL_VERIFICATION');

      expect(otpService.issue).toHaveBeenCalledWith(
        'user-id',
        'EMAIL_VERIFICATION',
      );

      expect(mailSender.send).toHaveBeenCalledTimes(1);
      const message = mailSender.send.mock.calls[0][0];

      expect(message.to).toBe('jane@example.com');
      expect(message.subject).toContain('WealthWise Backend');
      expect(message.text).toContain('123456');
      expect(message.html).toContain('123456');
    });

    it('uses a password-reset subject for reset codes', async () => {
      await service.sendOtp('user-id', recipient, 'PASSWORD_RESET');

      const message = mailSender.send.mock.calls[0][0];

      expect(message.subject).toMatch(/reset/i);
    });

    it('does not send mail when the cooldown rejects the request', async () => {
      otpService.issue.mockRejectedValue(new OtpResendTooSoonException(42));

      await expect(
        service.sendOtp('user-id', recipient, 'EMAIL_VERIFICATION'),
      ).rejects.toThrow(OtpResendTooSoonException);

      expect(mailSender.send).not.toHaveBeenCalled();
    });

    it('surfaces a delivery failure as a 503 application error', async () => {
      mailSender.send.mockRejectedValue(new EmailDeliveryFailedException());

      await expect(
        service.sendOtp('user-id', recipient, 'EMAIL_VERIFICATION'),
      ).rejects.toThrow(EmailDeliveryFailedException);
    });
  });

  describe('sendWelcome', () => {
    it('emails a welcome message', async () => {
      await service.sendWelcome(recipient);

      const message = mailSender.send.mock.calls[0][0];

      expect(message.to).toBe('jane@example.com');
      expect(message.subject).toContain('WealthWise Backend');
      expect(message.text).toContain('Jane');
    });

    it('never throws when delivery fails', async () => {
      mailSender.send.mockRejectedValue(new EmailDeliveryFailedException());

      await expect(service.sendWelcome(recipient)).resolves.toBeUndefined();
    });
  });
});
