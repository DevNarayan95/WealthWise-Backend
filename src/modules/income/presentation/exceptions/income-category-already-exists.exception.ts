import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class IncomeCategoryAlreadyExistsException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.INCOME_CATEGORY_ALREADY_EXISTS,
      'An income category with this name already exists',
      HttpStatus.CONFLICT,
    );
  }
}
