import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';
import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { User, UserProps } from '../../../users/domain/entities/user.entity';
import { PasswordHasherService } from '../../../../infrastructure/security/password-hasher.service';
import { EmailNotVerifiedException } from '../../presentation/exceptions/email-not-verified.exception';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let passwordHasher: {
    hash: jest.MockedFunction<PasswordHasherService['hash']>;
    verify: jest.MockedFunction<PasswordHasherService['verify']>;
  };
  let authSessionService: { openSession: jest.Mock };
  let configService: { getOrThrow: jest.Mock };

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

    passwordHasher = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    authSessionService = {
      openSession: jest.fn().mockResolvedValue({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
      }),
    };

    configService = {
      getOrThrow: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: userRepository,
        },
        {
          provide: PasswordHasherService,
          useValue: passwordHasher,
        },
        {
          provide: AuthSessionService,
          useValue: authSessionService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should authenticate a user with valid credentials', async () => {
      const user = createUser();

      userRepository.findByEmail.mockResolvedValue(user);
      passwordHasher.verify.mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );

      expect(passwordHasher.verify).toHaveBeenCalledWith(
        'Password123!',
        'hashed-password',
      );

      expect(authSessionService.openSession).toHaveBeenCalledWith(user);

      expect(result.user).toEqual(user);
      expect(result.accessToken).toBe('test-access-token');
      expect(result.refreshToken).toBe('test-refresh-token');
    });

    it('should reject an unknown email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(passwordHasher.verify).not.toHaveBeenCalled();
      expect(authSessionService.openSession).not.toHaveBeenCalled();
    });

    it('should reject an invalid password', async () => {
      const user = createUser();

      userRepository.findByEmail.mockResolvedValue(user);
      passwordHasher.verify.mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(passwordHasher.verify).toHaveBeenCalledWith(
        'WrongPassword!',
        'hashed-password',
      );
      expect(authSessionService.openSession).not.toHaveBeenCalled();
    });

    it('should use the same error message for unknown email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject login for an inactive user', async () => {
      const user = createUser({
        status: 'INACTIVE',
      });

      userRepository.findByEmail.mockResolvedValue(user);
      passwordHasher.verify.mockResolvedValue(true);

      await expect(
        service.login({
          email: user.email,
          password: 'Password123!',
        }),
      ).rejects.toThrow('User account is not active');

      expect(passwordHasher.verify).toHaveBeenCalledWith(
        'Password123!',
        'hashed-password',
      );

      expect(authSessionService.openSession).not.toHaveBeenCalled();
    });

    it('should reject login for a suspended user', async () => {
      const user = createUser({
        status: 'SUSPENDED',
      });

      userRepository.findByEmail.mockResolvedValue(user);
      passwordHasher.verify.mockResolvedValue(true);

      await expect(
        service.login({
          email: user.email,
          password: 'Password123!',
        }),
      ).rejects.toThrow('User account is not active');

      expect(passwordHasher.verify).toHaveBeenCalledWith(
        'Password123!',
        'hashed-password',
      );

      expect(authSessionService.openSession).not.toHaveBeenCalled();
    });

    it('should block login for an unverified user when verification is required', async () => {
      const user = createUser({ emailVerifiedAt: null });

      userRepository.findByEmail.mockResolvedValue(user);
      passwordHasher.verify.mockResolvedValue(true);

      await expect(
        service.login({
          email: user.email,
          password: 'Password123!',
        }),
      ).rejects.toThrow(EmailNotVerifiedException);

      expect(authSessionService.openSession).not.toHaveBeenCalled();
    });

    it('should allow login for an unverified user when verification is disabled', async () => {
      const user = createUser({ emailVerifiedAt: null });

      configService.getOrThrow.mockReturnValue(false);
      userRepository.findByEmail.mockResolvedValue(user);
      passwordHasher.verify.mockResolvedValue(true);

      const result = await service.login({
        email: user.email,
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('test-access-token');
    });

    it('should check the password before revealing the unverified state', async () => {
      const user = createUser({ emailVerifiedAt: null });

      userRepository.findByEmail.mockResolvedValue(user);
      passwordHasher.verify.mockResolvedValue(false);

      await expect(
        service.login({
          email: user.email,
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(authSessionService.openSession).not.toHaveBeenCalled();
    });
  });
});
