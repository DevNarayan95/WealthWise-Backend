import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class ExpenseCategoryNotFoundException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.EXPENSE_CATEGORY_NOT_FOUND,
      'Expense category not found',
      HttpStatus.NOT_FOUND,
    );
  }
}
