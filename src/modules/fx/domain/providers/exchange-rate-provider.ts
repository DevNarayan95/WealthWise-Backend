import type { StoredExchangeRate } from '../repositories/exchange-rate.repository';

export abstract class ExchangeRateProvider {
  abstract fetchRate(
    fromCurrency: string,
    toCurrency: string,
    rateDate: string,
  ): Promise<StoredExchangeRate>;
}
