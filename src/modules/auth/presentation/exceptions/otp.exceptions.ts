import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class OtpInvalidException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.OTP_INVALID,
      'The verification code is invalid or no longer active',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class OtpExpiredException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.OTP_EXPIRED,
      'The verification code has expired. Please request a new one',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class OtpAttemptsExceededException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.OTP_ATTEMPTS_EXCEEDED,
      'Too many incorrect attempts. Please request a new code',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class OtpResendTooSoonException extends ApplicationException {
  constructor(retryAfterSeconds: number) {
    super(
      ErrorCode.OTP_RESEND_TOO_SOON,
      `Please wait ${retryAfterSeconds} seconds before requesting another code`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
