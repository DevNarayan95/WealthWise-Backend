export interface StoredExchangeRate {
  rate: number;
  rateDate: string;
}

export interface SaveExchangeRateInput extends StoredExchangeRate {
  fromCurrency: string;
  toCurrency: string;
}

export abstract class ExchangeRateRepository {
  abstract findOnDate(
    fromCurrency: string,
    toCurrency: string,
    rateDate: string,
  ): Promise<StoredExchangeRate | null>;

  abstract findLatestOnOrBefore(
    fromCurrency: string,
    toCurrency: string,
    rateDate: string,
  ): Promise<StoredExchangeRate | null>;

  abstract findLatest(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<StoredExchangeRate | null>;

  abstract save(input: SaveExchangeRateInput): Promise<void>;
}
