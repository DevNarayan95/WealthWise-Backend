import { ExchangeRateProviderException } from './exchange-rate-provider.exception';

describe('ExchangeRateProviderException', () => {
  it('should keep the message and name', () => {
    const exception = new ExchangeRateProviderException('Provider down');

    expect(exception).toBeInstanceOf(Error);
    expect(exception.message).toBe('Provider down');
    expect(exception.name).toBe('ExchangeRateProviderException');
  });
});
