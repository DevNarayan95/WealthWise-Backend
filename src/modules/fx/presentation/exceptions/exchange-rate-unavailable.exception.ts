import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '../../../../common/constants/error-code.constant';
import { ApplicationException } from '../../../../common/exceptions/application.exception';

export class ExchangeRateUnavailableException extends ApplicationException {
  constructor() {
    super(
      ErrorCode.EXCHANGE_RATE_UNAVAILABLE,
      'Exchange rate is unavailable for this currency and date',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
