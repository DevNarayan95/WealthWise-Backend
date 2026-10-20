import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class InvalidRefreshTokenException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.INVALID_REFRESH_TOKEN,
      'Refresh token is invalid or expired. Sign in again.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
