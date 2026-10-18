import { Test, TestingModule } from '@nestjs/testing';

import { PrismaEmailOtpRepository } from './prisma-email-otp.repository';
import { EmailOtpRepository } from '../../domain/repositories/email-otp.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

describe('PrismaEmailOtpRepository', () => {
  let repository: EmailOtpRepository;
  let prisma: {
    emailOtp: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const row = {
    id: 'otp-id',
    userId: 'user-id',
    purpose: 'EMAIL_VERIFICATION',
    codeSalt: 'salt',
    codeHash: 'hash',
    attempts: 0,
    expiresAt: new Date('2026-01-01T00:10:00Z'),
    consumedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      emailOtp: {
        create: jest.fn().mockResolvedValue(row),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ ...row, attempts: 1 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback(prisma),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaEmailOtpRepository,
        { provide: PrismaService, useValue: prisma },
        {
          provide: EmailOtpRepository,
          useExisting: PrismaEmailOtpRepository,
        },
      ],
    }).compile();

    repository = module.get(EmailOtpRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createReplacing', () => {
    it('consumes open codes for the same user and purpose, then stores the new one in one transaction', async () => {
      const now = new Date('2026-01-01T00:00:00Z');
      jest.useFakeTimers({ now });

      try {
        const result = await repository.createReplacing({
          userId: 'user-id',
          purpose: 'EMAIL_VERIFICATION',
          codeSalt: 'salt',
          codeHash: 'hash',
          expiresAt: row.expiresAt,
        });

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(prisma.emailOtp.updateMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-id',
            purpose: 'EMAIL_VERIFICATION',
            consumedAt: null,
          },
          data: { consumedAt: now },
        });
        expect(prisma.emailOtp.create).toHaveBeenCalledWith({
          data: {
            userId: 'user-id',
            purpose: 'EMAIL_VERIFICATION',
            codeSalt: 'salt',
            codeHash: 'hash',
            expiresAt: row.expiresAt,
          },
        });
        expect(result).toEqual(row);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('findLatest', () => {
    it('returns the most recently created code for the user and purpose', async () => {
      prisma.emailOtp.findFirst.mockResolvedValue(row);

      const result = await repository.findLatest(
        'user-id',
        'PASSWORD_RESET',
      );

      expect(prisma.emailOtp.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-id', purpose: 'PASSWORD_RESET' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(row);
    });

    it('returns null when no code exists', async () => {
      prisma.emailOtp.findFirst.mockResolvedValue(null);

      await expect(
        repository.findLatest('user-id', 'EMAIL_VERIFICATION'),
      ).resolves.toBeNull();
    });
  });

  describe('incrementAttempts', () => {
    it('increments the counter in the database and returns the new value', async () => {
      const result = await repository.incrementAttempts('otp-id');

      expect(prisma.emailOtp.update).toHaveBeenCalledWith({
        where: { id: 'otp-id' },
        data: { attempts: { increment: 1 } },
      });
      expect(result).toBe(1);
    });
  });

  describe('markConsumed', () => {
    it('consumes an open code and reports success', async () => {
      const consumedAt = new Date('2026-01-01T00:01:00Z');

      const result = await repository.markConsumed('otp-id', consumedAt);

      expect(prisma.emailOtp.updateMany).toHaveBeenCalledWith({
        where: { id: 'otp-id', consumedAt: null },
        data: { consumedAt },
      });
      expect(result).toBe(true);
    });

    it('reports false when the code was already consumed', async () => {
      prisma.emailOtp.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        repository.markConsumed('otp-id', new Date()),
      ).resolves.toBe(false);
    });
  });
});
