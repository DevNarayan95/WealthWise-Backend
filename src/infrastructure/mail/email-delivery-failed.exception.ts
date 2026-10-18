import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../common/constants/error-code.constant';
import { ApplicationException } from '../../common/exceptions/application.exception';

export class EmailDeliveryFailedException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.EMAIL_DELIVERY_FAILED,
      'Unable to send the email right now. Please try again later.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
