import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';

import {
  EmailOtpPurpose,
  EmailOtpRepository,
} from '../../domain/repositories/email-otp.repository';
import {
  OtpAttemptsExceededException,
  OtpExpiredException,
  OtpInvalidException,
  OtpResendTooSoonException,
} from '../../presentation/exceptions/otp.exceptions';

/**
 * Issues and verifies one-time codes for email verification and password reset.
 * Codes are stored as HMAC-SHA256 digests keyed by the JWT secret. Rotating that
 * secret therefore also invalidates codes that are still pending.
 */
@Injectable()
export class OtpService {
  private readonly codeLength: number;
  private readonly expiresInMs: number;
  private readonly maxAttempts: number;
  private readonly resendCooldownMs: number;
  private readonly hashKey: string;

  constructor(
    private readonly emailOtpRepository: EmailOtpRepository,
    configService: ConfigService,
  ) {
    this.codeLength = configService.getOrThrow<number>('otp.length');
    this.expiresInMs =
      configService.getOrThrow<number>('otp.expiresInSeconds') * 1000;
    this.maxAttempts = configService.getOrThrow<number>('otp.maxAttempts');
    this.resendCooldownMs =
      configService.getOrThrow<number>('otp.resendCooldownSeconds') * 1000;
    this.hashKey = configService.getOrThrow<string>('secrets.jwtSecret');
  }

  /** Creates a new code, replaces any open one, and returns the plain code for delivery. */
  async issue(userId: string, purpose: EmailOtpPurpose): Promise<string> {
    const now = Date.now();
    const latest = await this.emailOtpRepository.findLatest(userId, purpose);

    if (latest) {
      const retryAt = latest.createdAt.getTime() + this.resendCooldownMs;

      if (retryAt > now) {
        throw new OtpResendTooSoonException(Math.ceil((retryAt - now) / 1000));
      }
    }

    const code = this.generateCode();
    const codeSalt = randomBytes(16).toString('hex');

    await this.emailOtpRepository.createReplacing({
      userId,
      purpose,
      codeSalt,
      codeHash: this.hashCode(codeSalt, purpose, code),
      expiresAt: new Date(now + this.expiresInMs),
    });

    return code;
  }

  /** Checks a code and consumes it on success. Wrong codes count toward the attempt limit. */
  async verify(
    userId: string,
    purpose: EmailOtpPurpose,
    code: string,
  ): Promise<void> {
    const record = await this.emailOtpRepository.findLatest(userId, purpose);

    if (!record || record.consumedAt) {
      throw new OtpInvalidException();
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new OtpExpiredException();
    }

    if (record.attempts >= this.maxAttempts) {
      throw new OtpAttemptsExceededException();
    }

    if (!this.matches(record.codeSalt, purpose, code, record.codeHash)) {
      const attempts = await this.emailOtpRepository.incrementAttempts(
        record.id,
      );

      if (attempts >= this.maxAttempts) {
        throw new OtpAttemptsExceededException();
      }

      throw new OtpInvalidException();
    }

    const consumed = await this.emailOtpRepository.markConsumed(
      record.id,
      new Date(),
    );

    if (!consumed) {
      throw new OtpInvalidException();
    }
  }

  private generateCode(): string {
    return randomInt(0, 10 ** this.codeLength)
      .toString()
      .padStart(this.codeLength, '0');
  }

  private hashCode(
    salt: string,
    purpose: EmailOtpPurpose,
    code: string,
  ): string {
    return createHmac('sha256', this.hashKey)
      .update(`${salt}:${purpose}:${code}`)
      .digest('hex');
  }

  private matches(
    salt: string,
    purpose: EmailOtpPurpose,
    code: string,
    expectedHash: string,
  ): boolean {
    const actual = Buffer.from(this.hashCode(salt, purpose, code), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');

    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
