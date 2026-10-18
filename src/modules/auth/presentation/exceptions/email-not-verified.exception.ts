import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class EmailNotVerifiedException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.EMAIL_NOT_VERIFIED,
      'Please verify your email address before signing in',
      HttpStatus.FORBIDDEN,
    );
  }
}
