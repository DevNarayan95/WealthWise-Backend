import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class SessionRevokedException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.SESSION_REVOKED,
      'Session has ended. Sign in again.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
