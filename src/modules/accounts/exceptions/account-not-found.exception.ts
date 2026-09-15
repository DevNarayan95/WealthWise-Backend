import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../common/exceptions/application.exception';

export class AccountNotFoundException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.ACCOUNT_NOT_FOUND,
      'Account not found',
      HttpStatus.NOT_FOUND,
    );
  }
}
