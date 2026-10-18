import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

import {
  CreateEmailOtpInput,
  EmailOtpPurpose,
  EmailOtpRecord,
  EmailOtpRepository,
} from '../../domain/repositories/email-otp.repository';

type PrismaDatabaseClient = Pick<PrismaService, 'emailOtp' | '$transaction'>;

@Injectable()
export class PrismaEmailOtpRepository extends EmailOtpRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaDatabaseClient,
  ) {
    super();
  }

  async createReplacing(input: CreateEmailOtpInput): Promise<EmailOtpRecord> {
    return this.prisma.$transaction(async (tx) => {
      await tx.emailOtp.updateMany({
        where: {
          userId: input.userId,
          purpose: input.purpose,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });

      const created = await tx.emailOtp.create({
        data: {
          userId: input.userId,
          purpose: input.purpose,
          codeSalt: input.codeSalt,
          codeHash: input.codeHash,
          expiresAt: input.expiresAt,
        },
      });

      return created;
    });
  }

  async findLatest(
    userId: string,
    purpose: EmailOtpPurpose,
  ): Promise<EmailOtpRecord | null> {
    return this.prisma.emailOtp.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: 'desc' },
    });
  }

  async incrementAttempts(id: string): Promise<number> {
    const updated = await this.prisma.emailOtp.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });

    return updated.attempts;
  }

  async markConsumed(id: string, consumedAt: Date): Promise<boolean> {
    const result = await this.prisma.emailOtp.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt },
    });

    return result.count === 1;
  }
}
