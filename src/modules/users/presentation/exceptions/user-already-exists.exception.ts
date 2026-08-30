import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class UserAlreadyExistsException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.USER_ALREADY_EXISTS,
      'A user with this email already exists',
      HttpStatus.CONFLICT,
    );
  }
}
