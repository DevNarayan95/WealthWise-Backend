import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy';
import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { User, UserProps } from '../../../users/domain/entities/user.entity';
import { AuthSessionRepository } from '../../domain/repositories/auth-session.repository';
import { SessionRevokedException } from '../../presentation/exceptions/session-revoked.exception';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<UserRepository>;
  let sessionRepository: jest.Mocked<AuthSessionRepository>;

  const activeSession = {
    id: 'session-id',
    userId: 'user-id',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
  };

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

  beforeEach(async () => {
    userRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findPermissionsByUserId: jest.fn(),
      markEmailVerified: jest.fn(),
      updatePasswordHash: jest.fn(),
    };

    sessionRepository = {
      createSession: jest.fn(),
      findActiveSessionById: jest.fn().mockResolvedValue(activeSession),
      findRefreshTokenByHash: jest.fn(),
      rotateRefreshToken: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllSessionsForUser: jest.fn(),
    };

    const configService = {
      getOrThrow: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: UserRepository,
          useValue: userRepository,
        },
        {
          provide: AuthSessionRepository,
          useValue: sessionRepository,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should authenticate an active user with an active session', async () => {
      const user = createUser();
      userRepository.findById.mockResolvedValue(user);

      await expect(
        strategy.validate({
          sub: user.id,
          email: user.email,
          sid: 'session-id',
        }),
      ).resolves.toEqual({
        userId: user.id,
        email: user.email,
        sessionId: 'session-id',
      });

      expect(userRepository.findById).toHaveBeenCalledWith(user.id);
      expect(sessionRepository.findActiveSessionById).toHaveBeenCalledWith(
        'session-id',
      );
    });

    it('should reject a token whose session has been revoked by logout', async () => {
      const user = createUser();
      userRepository.findById.mockResolvedValue(user);
      sessionRepository.findActiveSessionById.mockResolvedValue(null);

      await expect(
        strategy.validate({
          sub: user.id,
          email: user.email,
          sid: 'session-id',
        }),
      ).rejects.toBeInstanceOf(SessionRevokedException);
    });

    it('should reject a token that carries no session id', async () => {
      const user = createUser();
      userRepository.findById.mockResolvedValue(user);

      await expect(
        strategy.validate({ sub: user.id, email: user.email, sid: '' }),
      ).rejects.toBeInstanceOf(SessionRevokedException);

      expect(sessionRepository.findActiveSessionById).not.toHaveBeenCalled();
    });

    it('should reject a session that belongs to another user', async () => {
      const user = createUser();
      userRepository.findById.mockResolvedValue(user);
      sessionRepository.findActiveSessionById.mockResolvedValue({
        ...activeSession,
        userId: 'someone-else',
      });

      await expect(
        strategy.validate({
          sub: user.id,
          email: user.email,
          sid: 'session-id',
        }),
      ).rejects.toBeInstanceOf(SessionRevokedException);
    });

    it('should reject a token for a non-existent user', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        strategy.validate({
          sub: 'non-existent-user-id',
          email: 'non-existent@example.com',
          sid: 'session-id',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(userRepository.findById).toHaveBeenCalledWith(
        'non-existent-user-id',
      );
    });

    it('should reject an inactive user', async () => {
      const user = createUser({ status: 'INACTIVE' });

      userRepository.findById.mockResolvedValue(user);

      await expect(
        strategy.validate({
          sub: user.id,
          email: user.email,
          sid: 'session-id',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject a suspended user', async () => {
      const user = createUser({ status: 'SUSPENDED' });

      userRepository.findById.mockResolvedValue(user);

      await expect(
        strategy.validate({
          sub: user.id,
          email: user.email,
          sid: 'session-id',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should use the verified JWT identity after confirming the user is active', async () => {
      const user = createUser({
        email: 'current@example.com',
      });

      userRepository.findById.mockResolvedValue(user);

      await expect(
        strategy.validate({
          sub: user.id,
          email: user.email,
          sid: 'session-id',
        }),
      ).resolves.toEqual({
        userId: user.id,
        email: user.email,
        sessionId: 'session-id',
      });

      expect(userRepository.findById).toHaveBeenCalledWith(user.id);
    });
  });
});
