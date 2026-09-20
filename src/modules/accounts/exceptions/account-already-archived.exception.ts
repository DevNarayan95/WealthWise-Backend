import { HttpStatus } from '@nestjs/common';
import { ApplicationException } from '../../../common/exceptions/application.exception';
import { ErrorCode } from '../../../common/constants/error-code.constant';
export class AccountAlreadyArchivedApplicationException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.ACCOUNT_ALREADY_ARCHIVED,
      'Account is already archived',
      HttpStatus.CONFLICT,
    );
  }
}
