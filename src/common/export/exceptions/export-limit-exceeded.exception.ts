import { HttpStatus } from '@nestjs/common';

import { ApplicationException } from '../../exceptions/application.exception';
import { ErrorCode } from '../../constants/error-code.constant';

export class ExportLimitExceededException extends ApplicationException {
  constructor(maxRows: number) {
    super(
      ErrorCode.EXPORT_LIMIT_EXCEEDED,
      `Export exceeds the maximum of ${maxRows} rows. Narrow the filters and try again.`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
