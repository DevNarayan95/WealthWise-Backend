import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class ExpenseCategoryAlreadyExistsException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.EXPENSE_CATEGORY_ALREADY_EXISTS,
      'An expense category with this name already exists',
      HttpStatus.CONFLICT,
    );
  }
}
