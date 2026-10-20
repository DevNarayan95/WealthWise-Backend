import { randomBytes, createHash } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { User } from '../../../users/domain/entities/user.entity';
import {
  AuthSessionRepository,
  SessionRevokeReason,
} from '../../domain/repositories/auth-session.repository';
import { InvalidRefreshTokenException } from '../../presentation/exceptions/invalid-refresh-token.exception';
import { RefreshTokenReusedException } from '../../presentation/exceptions/refresh-token-reused.exception';

import { JwtPayload } from '../../infrastructure/interfaces/jwt-payload.interface';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly sessionRepository: AuthSessionRepository,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async openSession(user: User): Promise<SessionTokens> {
    const refreshToken = this.generateRefreshToken();
    const ttlDays = this.configService.getOrThrow<number>(
      'auth.refreshTokenTtlDays',
    );

    const session = await this.sessionRepository.createSession({
      userId: user.id,
      expiresAt: new Date(Date.now() + ttlDays * MILLISECONDS_PER_DAY),
      refreshTokenHash: this.hashToken(refreshToken),
    });

    const accessToken = await this.signAccessToken(
      user.id,
      user.email,
      session.id,
    );

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string): Promise<SessionTokens> {
    const current = await this.sessionRepository.findRefreshTokenByHash(
      this.hashToken(refreshToken),
    );

    if (!current) {
      throw new InvalidRefreshTokenException();
    }

    // A used token being presented again means it leaked or was replayed.
    // Revoke the whole session so the attacker's copy stops working too.
    if (current.usedAt) {
      await this.sessionRepository.revokeSession(
        current.sessionId,
        'REFRESH_TOKEN_REUSED',
      );
      throw new RefreshTokenReusedException();
    }

    const { session } = current;

    if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new InvalidRefreshTokenException();
    }

    const user = await this.userRepository.findById(session.userId);

    if (!user || user.status !== 'ACTIVE') {
      throw new InvalidRefreshTokenException();
    }

    const nextRefreshToken = this.generateRefreshToken();
    const rotated = await this.sessionRepository.rotateRefreshToken({
      currentTokenId: current.id,
      sessionId: session.id,
      nextTokenHash: this.hashToken(nextRefreshToken),
    });

    // Losing the rotation race means a concurrent request already used this
    // token, which is the same situation as reuse.
    if (!rotated) {
      await this.sessionRepository.revokeSession(
        session.id,
        'REFRESH_TOKEN_REUSED',
      );
      throw new RefreshTokenReusedException();
    }

    const accessToken = await this.signAccessToken(
      user.id,
      user.email,
      session.id,
    );

    return { accessToken, refreshToken: nextRefreshToken };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionRepository.revokeSession(sessionId, 'LOGOUT');
  }

  async revokeAllSessions(
    userId: string,
    reason: SessionRevokeReason,
  ): Promise<void> {
    await this.sessionRepository.revokeAllSessionsForUser(userId, reason);
  }

  private async signAccessToken(
    userId: string,
    email: string,
    sessionId: string,
  ): Promise<string> {
    const payload: JwtPayload = { sub: userId, email, sid: sessionId };

    return this.jwtService.signAsync(payload);
  }

  private generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
