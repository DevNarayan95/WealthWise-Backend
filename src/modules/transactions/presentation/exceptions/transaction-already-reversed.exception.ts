import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class TransactionAlreadyReversedException extends ApplicationException {
  constructor(message = 'Transaction has already been reversed') {
    super(
      ErrorCode.TRANSACTION_ALREADY_REVERSED,
      message,
      HttpStatus.BAD_REQUEST,
    );
  }
}
