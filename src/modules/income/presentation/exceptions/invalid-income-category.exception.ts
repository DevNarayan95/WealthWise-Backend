import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class InvalidIncomeCategoryException extends ApplicationException {
  constructor(message: string) {
    super(ErrorCode.INVALID_INCOME_CATEGORY, message, HttpStatus.BAD_REQUEST);
  }
}
