import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class SystemExpenseCategoryReadOnlyException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.SYSTEM_EXPENSE_CATEGORY_READ_ONLY,
      'System expense categories cannot be modified',
      HttpStatus.FORBIDDEN,
    );
  }
}
