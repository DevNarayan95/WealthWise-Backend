import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthController } from './presentation/controllers/auth.controller';
import { AuthService } from './application/services/auth.service';
import { AuthEmailService } from './application/services/auth-email.service';
import { OtpService } from './application/services/otp.service';
import { PasswordResetService } from './application/services/password-reset.service';
import { RegistrationService } from './application/services/registration.service';
import { AuthSessionService } from './application/services/auth-session.service';
import { EmailOtpRepository } from './domain/repositories/email-otp.repository';
import { PrismaEmailOtpRepository } from './infrastructure/repositories/prisma-email-otp.repository';
import { AuthSessionRepository } from './domain/repositories/auth-session.repository';
import { PrismaAuthSessionRepository } from './infrastructure/repositories/prisma-auth-session.repository';
import { AuthSessionCleanupService } from './application/services/auth-session-cleanup.service';
import { AuthSessionCleanupScheduler } from './infrastructure/scheduling/auth-session-cleanup.scheduler';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import type { SignOptions } from 'jsonwebtoken';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('secrets.jwtSecret'),
        signOptions: {
          expiresIn:
            configService.getOrThrow<SignOptions['expiresIn']>(
              'auth.jwtExpiresIn',
            ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionService,
    JwtStrategy,
    OtpService,
    AuthEmailService,
    RegistrationService,
    PasswordResetService,
    PrismaEmailOtpRepository,
    {
      provide: EmailOtpRepository,
      useExisting: PrismaEmailOtpRepository,
    },
    PrismaAuthSessionRepository,
    {
      provide: AuthSessionRepository,
      useExisting: PrismaAuthSessionRepository,
    },
    AuthSessionCleanupService,
    AuthSessionCleanupScheduler,
  ],
})
export class AuthModule {}
