import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../common/exceptions/application.exception';

export class InvalidAccountException extends ApplicationException {
  constructor(message: string) {
    super(ErrorCode.INVALID_ACCOUNT, message, HttpStatus.BAD_REQUEST);
  }
}
