import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class IncomeCategoryNotFoundException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.INCOME_CATEGORY_NOT_FOUND,
      'Income category not found',
      HttpStatus.NOT_FOUND,
    );
  }
}
