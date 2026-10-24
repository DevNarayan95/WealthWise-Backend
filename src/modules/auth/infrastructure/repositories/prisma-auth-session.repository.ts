import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

import {
  AuthSessionRecord,
  AuthSessionRepository,
  CreateAuthSessionInput,
  RefreshTokenRecord,
  RotateRefreshTokenInput,
  SessionRevokeReason,
} from '../../domain/repositories/auth-session.repository';

type PrismaDatabaseClient = Pick<
  PrismaService,
  'authSession' | 'authRefreshToken' | '$transaction'
>;

@Injectable()
export class PrismaAuthSessionRepository extends AuthSessionRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaDatabaseClient,
  ) {
    super();
  }

  async createSession(
    input: CreateAuthSessionInput,
  ): Promise<AuthSessionRecord> {
    return this.prisma.authSession.create({
      data: {
        userId: input.userId,
        expiresAt: input.expiresAt,
        refreshTokens: {
          create: { tokenHash: input.refreshTokenHash },
        },
      },
    });
  }

  async findActiveSessionById(id: string): Promise<AuthSessionRecord | null> {
    return this.prisma.authSession.findFirst({
      where: {
        id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<RefreshTokenRecord | null> {
    return this.prisma.authRefreshToken.findUnique({
      where: { tokenHash },
      include: { session: true },
    });
  }

  async rotateRefreshToken(input: RotateRefreshTokenInput): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // Only one request can flip usedAt from null, so this is the race guard.
      const consumed = await tx.authRefreshToken.updateMany({
        where: { id: input.currentTokenId, usedAt: null },
        data: { usedAt: now },
      });

      if (consumed.count !== 1) {
        return false;
      }

      await tx.authRefreshToken.create({
        data: {
          sessionId: input.sessionId,
          tokenHash: input.nextTokenHash,
        },
      });

      await tx.authSession.update({
        where: { id: input.sessionId },
        data: { lastUsedAt: now },
      });

      return true;
    });
  }

  async revokeSession(
    sessionId: string,
    reason: SessionRevokeReason,
  ): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  async revokeAllSessionsForUser(
    userId: string,
    reason: SessionRevokeReason,
  ): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  async deleteExpiredSessions(now: Date): Promise<number> {
    const result = await this.prisma.authSession.deleteMany({
      where: { expiresAt: { lte: now } },
    });

    return result.count;
  }
}
