import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class SystemIncomeCategoryReadOnlyException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.SYSTEM_INCOME_CATEGORY_READ_ONLY,
      'System income categories cannot be modified',
      HttpStatus.FORBIDDEN,
    );
  }
}
