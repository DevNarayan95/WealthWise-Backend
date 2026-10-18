export type EmailOtpPurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

export interface EmailOtpRecord {
  id: string;
  userId: string;
  purpose: EmailOtpPurpose;
  codeSalt: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface CreateEmailOtpInput {
  userId: string;
  purpose: EmailOtpPurpose;
  codeSalt: string;
  codeHash: string;
  expiresAt: Date;
}

export abstract class EmailOtpRepository {
  /**
   * Consumes every still-open OTP for the same user and purpose, then stores
   * the new one. Both steps run in one transaction so only one code is live.
   */
  abstract createReplacing(input: CreateEmailOtpInput): Promise<EmailOtpRecord>;

  /** Returns the most recently issued OTP, whether or not it is still open. */
  abstract findLatest(
    userId: string,
    purpose: EmailOtpPurpose,
  ): Promise<EmailOtpRecord | null>;

  /** Atomically increments the failed-attempt counter and returns the new value. */
  abstract incrementAttempts(id: string): Promise<number>;

  /** Marks the OTP consumed. Returns false if it was already consumed. */
  abstract markConsumed(id: string, consumedAt: Date): Promise<boolean>;
}
