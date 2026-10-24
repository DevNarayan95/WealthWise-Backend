import { createHash } from 'crypto';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthSessionService } from './auth-session.service';
import {
  AuthSessionRecord,
  AuthSessionRepository,
  RefreshTokenRecord,
} from '../../domain/repositories/auth-session.repository';
import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { User, UserProps } from '../../../users/domain/entities/user.entity';
import { InvalidRefreshTokenException } from '../../presentation/exceptions/invalid-refresh-token.exception';
import { RefreshTokenReusedException } from '../../presentation/exceptions/refresh-token-reused.exception';

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

describe('AuthSessionService', () => {
  let service: AuthSessionService;
  let sessionRepository: jest.Mocked<AuthSessionRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let jwtService: { signAsync: jest.Mock };
  let configService: { getOrThrow: jest.Mock };

  const futureDate = (days: number): Date =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const createUser = (overrides: Partial<UserProps> = {}): User =>
    User.create({
      id: 'user-id',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      firstName: 'John',
      lastName: 'Doe',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  const createSessionRecord = (
    overrides: Partial<AuthSessionRecord> = {},
  ): AuthSessionRecord => ({
    id: 'session-id',
    userId: 'user-id',
    expiresAt: futureDate(30),
    revokedAt: null,
    ...overrides,
  });

  const createRefreshTokenRecord = (
    overrides: Partial<RefreshTokenRecord> = {},
  ): RefreshTokenRecord => ({
    id: 'refresh-token-id',
    sessionId: 'session-id',
    usedAt: null,
    session: createSessionRecord(),
    ...overrides,
  });

  beforeEach(async () => {
    sessionRepository = {
      createSession: jest.fn(),
      findActiveSessionById: jest.fn(),
      findRefreshTokenByHash: jest.fn(),
      rotateRefreshToken: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllSessionsForUser: jest.fn(),
      deleteExpiredSessions: jest.fn(),
    };

    userRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findPermissionsByUserId: jest.fn(),
      markEmailVerified: jest.fn(),
      updatePasswordHash: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('access-token'),
    };

    configService = {
      getOrThrow: jest.fn().mockReturnValue(30),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthSessionService,
        { provide: AuthSessionRepository, useValue: sessionRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthSessionService);
  });

  describe('openSession', () => {
    it('issues an access token that carries the session id', async () => {
      const user = createUser();
      sessionRepository.createSession.mockResolvedValue(createSessionRecord());

      const tokens = await service.openSession(user);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-id',
        email: 'test@example.com',
        sid: 'session-id',
      });
      expect(tokens.accessToken).toBe('access-token');
      expect(tokens.refreshToken).toEqual(expect.any(String));
    });

    it('stores only a hash of the refresh token', async () => {
      const user = createUser();
      sessionRepository.createSession.mockResolvedValue(createSessionRecord());

      const tokens = await service.openSession(user);

      const input = sessionRepository.createSession.mock.calls[0][0];

      expect(input.refreshTokenHash).toBe(hashToken(tokens.refreshToken));
      expect(input.refreshTokenHash).not.toBe(tokens.refreshToken);
      expect(input.userId).toBe('user-id');
    });

    it('sets the session expiry from the configured refresh token lifetime', async () => {
      const user = createUser();
      sessionRepository.createSession.mockResolvedValue(createSessionRecord());
      const before = Date.now();

      await service.openSession(user);

      const input = sessionRepository.createSession.mock.calls[0][0];
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'auth.refreshTokenTtlDays',
      );
      expect(input.expiresAt.getTime()).toBeGreaterThanOrEqual(
        before + thirtyDaysMs,
      );
      expect(input.expiresAt.getTime()).toBeLessThanOrEqual(
        Date.now() + thirtyDaysMs,
      );
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and returns a new access token', async () => {
      sessionRepository.findRefreshTokenByHash.mockResolvedValue(
        createRefreshTokenRecord(),
      );
      sessionRepository.rotateRefreshToken.mockResolvedValue(true);
      userRepository.findById.mockResolvedValue(createUser());

      const tokens = await service.refresh('old-refresh-token');

      expect(sessionRepository.findRefreshTokenByHash).toHaveBeenCalledWith(
        hashToken('old-refresh-token'),
      );
      expect(sessionRepository.rotateRefreshToken).toHaveBeenCalledWith({
        currentTokenId: 'refresh-token-id',
        sessionId: 'session-id',
        nextTokenHash: hashToken(tokens.refreshToken),
      });
      expect(tokens.refreshToken).not.toBe('old-refresh-token');
      expect(tokens.accessToken).toBe('access-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-id',
        email: 'test@example.com',
        sid: 'session-id',
      });
    });

    it('rejects an unknown refresh token', async () => {
      sessionRepository.findRefreshTokenByHash.mockResolvedValue(null);

      await expect(service.refresh('unknown')).rejects.toBeInstanceOf(
        InvalidRefreshTokenException,
      );
      expect(sessionRepository.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('revokes the whole session when a used refresh token is presented again', async () => {
      sessionRepository.findRefreshTokenByHash.mockResolvedValue(
        createRefreshTokenRecord({ usedAt: new Date() }),
      );

      await expect(service.refresh('reused-token')).rejects.toBeInstanceOf(
        RefreshTokenReusedException,
      );
      expect(sessionRepository.revokeSession).toHaveBeenCalledWith(
        'session-id',
        'REFRESH_TOKEN_REUSED',
      );
      expect(sessionRepository.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('treats a lost rotation race as reuse and revokes the session', async () => {
      sessionRepository.findRefreshTokenByHash.mockResolvedValue(
        createRefreshTokenRecord(),
      );
      sessionRepository.rotateRefreshToken.mockResolvedValue(false);
      userRepository.findById.mockResolvedValue(createUser());

      await expect(service.refresh('raced-token')).rejects.toBeInstanceOf(
        RefreshTokenReusedException,
      );
      expect(sessionRepository.revokeSession).toHaveBeenCalledWith(
        'session-id',
        'REFRESH_TOKEN_REUSED',
      );
    });

    it('rejects a refresh token whose session was revoked', async () => {
      sessionRepository.findRefreshTokenByHash.mockResolvedValue(
        createRefreshTokenRecord({
          session: createSessionRecord({ revokedAt: new Date() }),
        }),
      );

      await expect(service.refresh('token')).rejects.toBeInstanceOf(
        InvalidRefreshTokenException,
      );
      expect(sessionRepository.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects a refresh token whose session has expired', async () => {
      sessionRepository.findRefreshTokenByHash.mockResolvedValue(
        createRefreshTokenRecord({
          session: createSessionRecord({ expiresAt: new Date(Date.now() - 1) }),
        }),
      );

      await expect(service.refresh('token')).rejects.toBeInstanceOf(
        InvalidRefreshTokenException,
      );
      expect(sessionRepository.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects a refresh for a user who is no longer active', async () => {
      sessionRepository.findRefreshTokenByHash.mockResolvedValue(
        createRefreshTokenRecord(),
      );
      userRepository.findById.mockResolvedValue(
        createUser({ status: 'SUSPENDED' }),
      );

      await expect(service.refresh('token')).rejects.toBeInstanceOf(
        InvalidRefreshTokenException,
      );
      expect(sessionRepository.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects a refresh when the user no longer exists', async () => {
      sessionRepository.findRefreshTokenByHash.mockResolvedValue(
        createRefreshTokenRecord(),
      );
      userRepository.findById.mockResolvedValue(null);

      await expect(service.refresh('token')).rejects.toBeInstanceOf(
        InvalidRefreshTokenException,
      );
    });
  });

  describe('logout', () => {
    it('revokes the given session with the LOGOUT reason', async () => {
      await service.logout('session-id');

      expect(sessionRepository.revokeSession).toHaveBeenCalledWith(
        'session-id',
        'LOGOUT',
      );
    });
  });

  describe('revokeAllSessions', () => {
    it('revokes every session of the user with the given reason', async () => {
      await service.revokeAllSessions('user-id', 'LOGOUT_ALL');

      expect(sessionRepository.revokeAllSessionsForUser).toHaveBeenCalledWith(
        'user-id',
        'LOGOUT_ALL',
      );
    });
  });
});
