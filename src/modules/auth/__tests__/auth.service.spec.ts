import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from '../services/auth.service';
import { UserRepository } from '../../users/domain/repositories/user.repository';
import { PasswordHasherService } from '../../users/services/password-hasher.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let passwordHasher: {
    hash: jest.MockedFunction<PasswordHasherService['hash']>;
    verify: jest.MockedFunction<PasswordHasherService['verify']>;
  };
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    userRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findPermissionsByUserId: jest.fn(),
    };

    passwordHasher = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    } as any;

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
          provide: JwtService,
          useValue: jwtService,
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
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
      } as any;

      userRepository.findByEmail.mockResolvedValue(user);
      passwordHasher.verify.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('test-access-token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );

      expect(passwordHasher.verify).toHaveBeenCalledWith(
        'Password123!',
        'hashed-password',
      );

      expect(result.user).toEqual(user);
      expect(result.accessToken).toBe('test-access-token');
    });

    it('should reject an unknown email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      jwtService.signAsync.mockResolvedValue('test-access-token');

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(passwordHasher.verify).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should reject an invalid password', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      } as any;

      userRepository.findByEmail.mockResolvedValue(user);
      passwordHasher.verify.mockResolvedValue(false);
      jwtService.signAsync.mockResolvedValue('test-access-token');

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
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
