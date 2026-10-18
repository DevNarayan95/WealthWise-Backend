import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { RegistrationService } from './registration.service';
import { AuthEmailService } from './auth-email.service';
import { OtpService } from './otp.service';
import { UsersService } from '../../../users/application/services/users.service';
import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { User, UserProps } from '../../../users/domain/entities/user.entity';
import { UserAlreadyExistsException } from '../../../users/presentation/exceptions/user-already-exists.exception';
import { EmailDeliveryFailedException } from '../../../../infrastructure/mail/email-delivery-failed.exception';
import { OtpInvalidException } from '../../presentation/exceptions/otp.exceptions';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let usersService: jest.Mocked<Pick<UsersService, 'create'>>;
  let userRepository: jest.Mocked<
    Pick<UserRepository, 'findByEmail' | 'markEmailVerified'>
  >;
  let otpService: jest.Mocked<Pick<OtpService, 'verify'>>;
  let authEmailService: jest.Mocked<AuthEmailService>;

  const createUser = (overrides: Partial<UserProps> = {}): User =>
    User.create({
      id: 'user-id',
      email: 'jane@example.com',
      passwordHash: 'hash',
      firstName: 'Jane',
      lastName: 'Doe',
      status: 'ACTIVE',
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  const registerInput = {
    email: 'jane@example.com',
    password: 'Password123!',
    firstName: 'Jane',
    lastName: 'Doe',
  };

  beforeEach(async () => {
    usersService = { create: jest.fn() };
    userRepository = {
      findByEmail: jest.fn(),
      markEmailVerified: jest.fn().mockResolvedValue(undefined),
    };
    otpService = { verify: jest.fn().mockResolvedValue(undefined) };
    authEmailService = {
      sendOtp: jest.fn().mockResolvedValue(undefined),
      sendWelcome: jest.fn().mockResolvedValue(undefined),
    } as any;

    service = await buildService(true);
  });

  const buildService = async (
    emailVerificationRequired: boolean,
  ): Promise<RegistrationService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: UsersService, useValue: usersService },
        { provide: UserRepository, useValue: userRepository },
        { provide: OtpService, useValue: otpService },
        { provide: AuthEmailService, useValue: authEmailService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'registration.emailVerificationRequired') {
                return emailVerificationRequired;
              }
              throw new Error(`Unexpected config key ${key}`);
            }),
          },
        },
      ],
    }).compile();

    return module.get(RegistrationService);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates an unverified user and emails a verification code', async () => {
      const user = createUser();
      usersService.create.mockResolvedValue(user);

      const result = await service.register(registerInput);

      expect(usersService.create).toHaveBeenCalledWith({
        ...registerInput,
        emailVerified: false,
      });
      expect(authEmailService.sendOtp).toHaveBeenCalledWith(
        user.id,
        { email: user.email, firstName: user.firstName },
        'EMAIL_VERIFICATION',
      );
      expect(authEmailService.sendWelcome).not.toHaveBeenCalled();
      expect(result).toEqual({ user, verificationRequired: true });
    });

    it('creates a verified user and sends the welcome email when verification is disabled', async () => {
      const disabledService = await buildService(false);
      const user = createUser({ emailVerifiedAt: new Date() });
      usersService.create.mockResolvedValue(user);

      const result = await disabledService.register(registerInput);

      expect(usersService.create).toHaveBeenCalledWith({
        ...registerInput,
        emailVerified: true,
      });
      expect(authEmailService.sendOtp).not.toHaveBeenCalled();
      expect(authEmailService.sendWelcome).toHaveBeenCalledWith({
        email: user.email,
        firstName: user.firstName,
      });
      expect(result).toEqual({ user, verificationRequired: false });
    });

    it('propagates a duplicate email without sending anything', async () => {
      usersService.create.mockRejectedValue(new UserAlreadyExistsException());

      await expect(service.register(registerInput)).rejects.toThrow(
        UserAlreadyExistsException,
      );

      expect(authEmailService.sendOtp).not.toHaveBeenCalled();
    });

    it('keeps the user but reports 503 when the verification email cannot be sent', async () => {
      const user = createUser();
      usersService.create.mockResolvedValue(user);
      authEmailService.sendOtp.mockRejectedValue(
        new EmailDeliveryFailedException(),
      );

      await expect(service.register(registerInput)).rejects.toThrow(
        EmailDeliveryFailedException,
      );

      expect(usersService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyEmail', () => {
    it('verifies the email, marks the user, and sends the welcome email', async () => {
      const user = createUser();
      userRepository.findByEmail.mockResolvedValue(user);

      await service.verifyEmail('jane@example.com', '123456');

      expect(otpService.verify).toHaveBeenCalledWith(
        user.id,
        'EMAIL_VERIFICATION',
        '123456',
      );
      expect(userRepository.markEmailVerified).toHaveBeenCalledWith(
        user.id,
        expect.any(Date),
      );
      expect(authEmailService.sendWelcome).toHaveBeenCalledWith({
        email: user.email,
        firstName: user.firstName,
      });
    });

    it('rejects an unknown email with the same error as a wrong code', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.verifyEmail('nobody@example.com', '123456'),
      ).rejects.toThrow(OtpInvalidException);

      expect(otpService.verify).not.toHaveBeenCalled();
      expect(userRepository.markEmailVerified).not.toHaveBeenCalled();
    });

    it('is a no-op for an already verified user', async () => {
      userRepository.findByEmail.mockResolvedValue(
        createUser({ emailVerifiedAt: new Date() }),
      );

      await service.verifyEmail('jane@example.com', '123456');

      expect(otpService.verify).not.toHaveBeenCalled();
      expect(userRepository.markEmailVerified).not.toHaveBeenCalled();
      expect(authEmailService.sendWelcome).not.toHaveBeenCalled();
    });

    it('does not mark the user when the code is wrong', async () => {
      userRepository.findByEmail.mockResolvedValue(createUser());
      otpService.verify.mockRejectedValue(new OtpInvalidException());

      await expect(
        service.verifyEmail('jane@example.com', '000000'),
      ).rejects.toThrow(OtpInvalidException);

      expect(userRepository.markEmailVerified).not.toHaveBeenCalled();
    });
  });

  describe('resendVerification', () => {
    it('sends a fresh code to an unverified user', async () => {
      const user = createUser();
      userRepository.findByEmail.mockResolvedValue(user);

      await service.resendVerification('jane@example.com');

      expect(authEmailService.sendOtp).toHaveBeenCalledWith(
        user.id,
        { email: user.email, firstName: user.firstName },
        'EMAIL_VERIFICATION',
      );
    });

    it('stays silent for an unknown email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.resendVerification('nobody@example.com'),
      ).resolves.toBeUndefined();

      expect(authEmailService.sendOtp).not.toHaveBeenCalled();
    });

    it('stays silent for an already verified user', async () => {
      userRepository.findByEmail.mockResolvedValue(
        createUser({ emailVerifiedAt: new Date() }),
      );

      await service.resendVerification('jane@example.com');

      expect(authEmailService.sendOtp).not.toHaveBeenCalled();
    });
  });
});
