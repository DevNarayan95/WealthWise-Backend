import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class TransactionCannotBeReversedException extends ApplicationException {
  constructor(message = 'Transaction cannot be reversed') {
    super(
      ErrorCode.TRANSACTION_CANNOT_BE_REVERSED,
      message,
      HttpStatus.BAD_REQUEST,
    );
  }
}
