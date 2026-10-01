import { HttpStatus } from '@nestjs/common';

import { ApplicationException } from '../../../common/exceptions/application.exception';
import { ErrorCode } from '../../../common/constants/error-code.constant';

export class InvalidTransactionException extends ApplicationException {
  constructor(message: string) {
    super(ErrorCode.INVALID_TRANSACTION, message, HttpStatus.BAD_REQUEST);
  }
}
