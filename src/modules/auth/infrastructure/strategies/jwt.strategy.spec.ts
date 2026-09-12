import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy';
import { UserRepository } from '../../../users/domain/repositories/user.repository';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<UserRepository>;

  const createUser = (
    overrides: Partial<{
      id: string;
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
      status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
      createdAt: Date;
      updatedAt: Date;
    }> = {},
  ) => ({
    id: 'user-id',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    status: 'ACTIVE' as const,
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
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should authenticate an active user', async () => {
      const user = createUser();
      userRepository.findById.mockResolvedValue(user);

      await expect(
        strategy.validate({ sub: user.id, email: user.email }),
      ).resolves.toEqual({
        userId: user.id,
        email: user.email,
      });

      expect(userRepository.findById).toHaveBeenCalledWith(user.id);
    });

    it('should reject a token for a non-existent user', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        strategy.validate({
          sub: 'non-existent-user-id',
          email: 'non-existent@example.com',
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
        strategy.validate({ sub: user.id, email: user.email }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject a suspended user', async () => {
      const user = createUser({ status: 'SUSPENDED' });

      userRepository.findById.mockResolvedValue(user);

      await expect(
        strategy.validate({ sub: user.id, email: user.email }),
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
        }),
      ).resolves.toEqual({
        userId: user.id,
        email: user.email,
      });

      expect(userRepository.findById).toHaveBeenCalledWith(user.id);
    });
  });
});
