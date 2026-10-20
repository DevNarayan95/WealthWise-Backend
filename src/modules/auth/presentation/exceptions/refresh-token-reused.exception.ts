import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

/**
 * Raised when an already-rotated refresh token is presented again. The whole
 * session has been revoked by the time this is thrown.
 */
export class RefreshTokenReusedException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.REFRESH_TOKEN_REUSED,
      'Refresh token was already used. All sessions for this login have been revoked. Sign in again.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
