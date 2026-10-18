import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { OtpService } from './otp.service';
import {
  CreateEmailOtpInput,
  EmailOtpRecord,
  EmailOtpRepository,
} from '../../domain/repositories/email-otp.repository';
import {
  OtpAttemptsExceededException,
  OtpExpiredException,
  OtpInvalidException,
  OtpResendTooSoonException,
} from '../../presentation/exceptions/otp.exceptions';

describe('OtpService', () => {
  const now = new Date('2026-01-01T10:00:00.000Z');

  const otpConfig = {
    'otp.length': 6,
    'otp.expiresInSeconds': 600,
    'otp.maxAttempts': 3,
    'otp.resendCooldownSeconds': 60,
    'secrets.jwtSecret': 'x'.repeat(40),
  };

  let service: OtpService;
  let repository: jest.Mocked<EmailOtpRepository>;

  const recordFrom = (
    input: CreateEmailOtpInput,
    overrides: Partial<EmailOtpRecord> = {},
  ): EmailOtpRecord => ({
    id: 'otp-id',
    userId: input.userId,
    purpose: input.purpose,
    codeSalt: input.codeSalt,
    codeHash: input.codeHash,
    attempts: 0,
    expiresAt: input.expiresAt,
    consumedAt: null,
    createdAt: now,
    ...overrides,
  });

  beforeEach(async () => {
    jest.useFakeTimers({ now });

    repository = {
      createReplacing: jest.fn(),
      findLatest: jest.fn(),
      incrementAttempts: jest.fn(),
      markConsumed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: EmailOtpRepository, useValue: repository },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              return otpConfig[key as keyof typeof otpConfig];
            }),
          },
        },
      ],
    }).compile();

    service = module.get(OtpService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('issue', () => {
    it('returns a numeric code of the configured length', async () => {
      repository.findLatest.mockResolvedValue(null);
      repository.createReplacing.mockImplementation(async (input) =>
        recordFrom(input),
      );

      const code = await service.issue('user-id', 'EMAIL_VERIFICATION');

      expect(code).toMatch(/^\d{6}$/);
    });

    it('stores a salted hash and an expiry, never the plain code', async () => {
      repository.findLatest.mockResolvedValue(null);
      repository.createReplacing.mockImplementation(async (input) =>
        recordFrom(input),
      );

      const code = await service.issue('user-id', 'PASSWORD_RESET');

      const stored = repository.createReplacing.mock.calls[0][0];

      expect(stored.userId).toBe('user-id');
      expect(stored.purpose).toBe('PASSWORD_RESET');
      expect(stored.codeSalt).toMatch(/^[0-9a-f]{32}$/);
      expect(stored.codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(stored.codeHash).not.toContain(code);
      expect(stored.expiresAt).toEqual(new Date(now.getTime() + 600_000));
    });

    it('rejects a resend inside the cooldown window', async () => {
      repository.findLatest.mockResolvedValue({
        id: 'previous',
        userId: 'user-id',
        purpose: 'EMAIL_VERIFICATION',
        codeSalt: 'salt',
        codeHash: 'hash',
        attempts: 0,
        expiresAt: new Date(now.getTime() + 600_000),
        consumedAt: null,
        createdAt: new Date(now.getTime() - 30_000),
      });

      await expect(
        service.issue('user-id', 'EMAIL_VERIFICATION'),
      ).rejects.toThrow(OtpResendTooSoonException);

      expect(repository.createReplacing).not.toHaveBeenCalled();
    });

    it('allows a resend once the cooldown has passed', async () => {
      repository.findLatest.mockResolvedValue({
        id: 'previous',
        userId: 'user-id',
        purpose: 'EMAIL_VERIFICATION',
        codeSalt: 'salt',
        codeHash: 'hash',
        attempts: 0,
        expiresAt: new Date(now.getTime() + 600_000),
        consumedAt: null,
        createdAt: new Date(now.getTime() - 61_000),
      });
      repository.createReplacing.mockImplementation(async (input) =>
        recordFrom(input),
      );

      await expect(
        service.issue('user-id', 'EMAIL_VERIFICATION'),
      ).resolves.toMatch(/^\d{6}$/);
    });
  });

  describe('verify', () => {
    const issueCode = async (
      purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' = 'EMAIL_VERIFICATION',
    ): Promise<{ code: string; record: EmailOtpRecord }> => {
      repository.findLatest.mockResolvedValue(null);
      let stored: CreateEmailOtpInput | undefined;
      repository.createReplacing.mockImplementation(async (input) => {
        stored = input;
        return recordFrom(input);
      });

      const code = await service.issue('user-id', purpose);

      return { code, record: recordFrom(stored!) };
    };

    it('accepts the correct code and consumes it', async () => {
      const { code, record } = await issueCode();
      repository.findLatest.mockResolvedValue(record);
      repository.markConsumed.mockResolvedValue(true);

      await expect(
        service.verify('user-id', 'EMAIL_VERIFICATION', code),
      ).resolves.toBeUndefined();

      expect(repository.markConsumed).toHaveBeenCalledWith('otp-id', now);
    });

    it('rejects when no code is open', async () => {
      repository.findLatest.mockResolvedValue(null);

      await expect(
        service.verify('user-id', 'EMAIL_VERIFICATION', '123456'),
      ).rejects.toThrow(OtpInvalidException);
    });

    it('rejects a code that was already consumed', async () => {
      const { code, record } = await issueCode();
      repository.findLatest.mockResolvedValue({
        ...record,
        consumedAt: now,
      });

      await expect(
        service.verify('user-id', 'EMAIL_VERIFICATION', code),
      ).rejects.toThrow(OtpInvalidException);

      expect(repository.markConsumed).not.toHaveBeenCalled();
    });

    it('rejects an expired code without counting an attempt', async () => {
      const { code, record } = await issueCode();
      repository.findLatest.mockResolvedValue({
        ...record,
        expiresAt: new Date(now.getTime() - 1),
      });

      await expect(
        service.verify('user-id', 'EMAIL_VERIFICATION', code),
      ).rejects.toThrow(OtpExpiredException);

      expect(repository.incrementAttempts).not.toHaveBeenCalled();
    });

    it('counts a wrong code and rejects it as invalid', async () => {
      const { record } = await issueCode();
      repository.findLatest.mockResolvedValue(record);
      repository.incrementAttempts.mockResolvedValue(1);

      await expect(
        service.verify('user-id', 'EMAIL_VERIFICATION', '000000x'),
      ).rejects.toThrow(OtpInvalidException);

      expect(repository.incrementAttempts).toHaveBeenCalledWith('otp-id');
      expect(repository.markConsumed).not.toHaveBeenCalled();
    });

    it('locks the code once the final allowed attempt is used', async () => {
      const { record } = await issueCode();
      repository.findLatest.mockResolvedValue(record);
      repository.incrementAttempts.mockResolvedValue(3);

      await expect(
        service.verify('user-id', 'EMAIL_VERIFICATION', '000000x'),
      ).rejects.toThrow(OtpAttemptsExceededException);
    });

    it('refuses to check a code once attempts are exhausted', async () => {
      const { code, record } = await issueCode();
      repository.findLatest.mockResolvedValue({ ...record, attempts: 3 });

      await expect(
        service.verify('user-id', 'EMAIL_VERIFICATION', code),
      ).rejects.toThrow(OtpAttemptsExceededException);

      expect(repository.markConsumed).not.toHaveBeenCalled();
    });

    it('does not accept a code issued for a different purpose', async () => {
      const { code, record } = await issueCode('PASSWORD_RESET');
      repository.findLatest.mockImplementation(async (_userId, purpose) =>
        purpose === 'PASSWORD_RESET' ? record : null,
      );

      await expect(
        service.verify('user-id', 'EMAIL_VERIFICATION', code),
      ).rejects.toThrow(OtpInvalidException);
    });

    it('treats a lost consume race as invalid', async () => {
      const { code, record } = await issueCode();
      repository.findLatest.mockResolvedValue(record);
      repository.markConsumed.mockResolvedValue(false);

      await expect(
        service.verify('user-id', 'EMAIL_VERIFICATION', code),
      ).rejects.toThrow(OtpInvalidException);
    });
  });
});
