import { HttpStatus } from '@nestjs/common';

import { ExchangeRateUnavailableException } from './exchange-rate-unavailable.exception';

describe('ExchangeRateUnavailableException', () => {
  it('should create a 503 application exception', () => {
    const exception = new ExchangeRateUnavailableException();

    expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(exception.getResponse()).toEqual({
      code: 'EXCHANGE_RATE_UNAVAILABLE',
      message: 'Exchange rate is unavailable for this currency and date',
    });
  });
});
