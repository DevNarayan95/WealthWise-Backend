export class ExchangeRateProviderException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExchangeRateProviderException';
  }
}
