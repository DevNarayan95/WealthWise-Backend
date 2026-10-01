import { HttpStatus } from '@nestjs/common';

import { ApplicationException } from '../../../common/exceptions/application.exception';
import { ErrorCode } from '../../../common/constants/error-code.constant';

export class TransactionNotFoundException extends ApplicationException {
  constructor(message: string) {
    super(ErrorCode.TRANSACTION_NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}
