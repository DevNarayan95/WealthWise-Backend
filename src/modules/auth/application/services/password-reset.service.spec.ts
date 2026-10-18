import { Test, TestingModule } from '@nestjs/testing';

import { PasswordResetService } from './password-reset.service';
import { AuthEmailService } from './auth-email.service';
import { OtpService } from './otp.service';
import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { User, UserProps } from '../../../users/domain/entities/user.entity';
import { PasswordHasherService } from '../../../../infrastructure/security/password-hasher.service';
import { EmailDeliveryFailedException } from '../../../../infrastructure/mail/email-delivery-failed.exception';
import {
  OtpInvalidException,
  OtpResendTooSoonException,
} from '../../presentation/exceptions/otp.exceptions';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let userRepository: jest.Mocked<
    Pick<
      UserRepository,
      'findByEmail' | 'markEmailVerified' | 'updatePasswordHash'
    >
  >;
  let otpService: jest.Mocked<Pick<OtpService, 'verify'>>;
  let authEmailService: jest.Mocked<Pick<AuthEmailService, 'sendOtp'>>;
  let passwordHasher: jest.Mocked<Pick<PasswordHasherService, 'hash'>>;

  const createUser = (overrides: Partial<UserProps> = {}): User =>
    User.create({
      id: 'user-id',
      email: 'jane@example.com',
      passwordHash: 'old-hash',
      firstName: 'Jane',
      lastName: 'Doe',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  beforeEach(async () => {
    userRepository = {
      findByEmail: jest.fn(),
      markEmailVerified: jest.fn().mockResolvedValue(undefined),
      updatePasswordHash: jest.fn().mockResolvedValue(undefined),
    };
    otpService = { verify: jest.fn().mockResolvedValue(undefined) };
    authEmailService = { sendOtp: jest.fn().mockResolvedValue(undefined) };
    passwordHasher = { hash: jest.fn().mockResolvedValue('new-hash') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: UserRepository, useValue: userRepository },
        { provide: OtpService, useValue: otpService },
        { provide: AuthEmailService, useValue: authEmailService },
        { provide: PasswordHasherService, useValue: passwordHasher },
      ],
    }).compile();

    service = module.get(PasswordResetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('forgotPassword', () => {
    it('emails a reset code to a known user', async () => {
      const user = createUser();
      userRepository.findByEmail.mockResolvedValue(user);

      await service.forgotPassword('jane@example.com');

      expect(authEmailService.sendOtp).toHaveBeenCalledWith(
        user.id,
        { email: user.email, firstName: user.firstName },
        'PASSWORD_RESET',
      );
    });

    it('stays silent for an unknown email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.forgotPassword('nobody@example.com'),
      ).resolves.toBeUndefined();

      expect(authEmailService.sendOtp).not.toHaveBeenCalled();
    });

    it('stays silent when a code was requested too recently', async () => {
      userRepository.findByEmail.mockResolvedValue(createUser());
      authEmailService.sendOtp.mockRejectedValue(
        new OtpResendTooSoonException(30),
      );

      await expect(
        service.forgotPassword('jane@example.com'),
      ).resolves.toBeUndefined();
    });

    it('stays silent when the email cannot be delivered', async () => {
      userRepository.findByEmail.mockResolvedValue(createUser());
      authEmailService.sendOtp.mockRejectedValue(
        new EmailDeliveryFailedException(),
      );

      await expect(
        service.forgotPassword('jane@example.com'),
      ).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('verifies the code, stores the new hash, and marks the email verified', async () => {
      const user = createUser({ emailVerifiedAt: null });
      userRepository.findByEmail.mockResolvedValue(user);

      await service.resetPassword(
        'jane@example.com',
        '123456',
        'NewPassword123!',
      );

      expect(otpService.verify).toHaveBeenCalledWith(
        user.id,
        'PASSWORD_RESET',
        '123456',
      );
      expect(passwordHasher.hash).toHaveBeenCalledWith('NewPassword123!');
      expect(userRepository.updatePasswordHash).toHaveBeenCalledWith(
        user.id,
        'new-hash',
      );
      expect(userRepository.markEmailVerified).toHaveBeenCalledWith(
        user.id,
        expect.any(Date),
      );
    });

    it('does not touch the verification timestamp for a verified user', async () => {
      userRepository.findByEmail.mockResolvedValue(createUser());

      await service.resetPassword(
        'jane@example.com',
        '123456',
        'NewPassword123!',
      );

      expect(userRepository.updatePasswordHash).toHaveBeenCalled();
      expect(userRepository.markEmailVerified).not.toHaveBeenCalled();
    });

    it('rejects an unknown email without changing anything', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.resetPassword(
          'nobody@example.com',
          '123456',
          'NewPassword123!',
        ),
      ).rejects.toThrow(OtpInvalidException);

      expect(passwordHasher.hash).not.toHaveBeenCalled();
      expect(userRepository.updatePasswordHash).not.toHaveBeenCalled();
    });

    it('does not change the password when the code is wrong', async () => {
      userRepository.findByEmail.mockResolvedValue(createUser());
      otpService.verify.mockRejectedValue(new OtpInvalidException());

      await expect(
        service.resetPassword('jane@example.com', '000000', 'NewPassword123!'),
      ).rejects.toThrow(OtpInvalidException);

      expect(passwordHasher.hash).not.toHaveBeenCalled();
      expect(userRepository.updatePasswordHash).not.toHaveBeenCalled();
    });
  });
});
