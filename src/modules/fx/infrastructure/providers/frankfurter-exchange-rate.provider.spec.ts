import { ExchangeRateProviderException } from './exchange-rate-provider.exception';
import { FrankfurterExchangeRateProvider } from './frankfurter-exchange-rate.provider';

describe('FrankfurterExchangeRateProvider', () => {
  const baseUrl = 'https://api.example.test/v1';
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it('should request the rate for the date and return the rate for the target currency', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        amount: 1,
        base: 'MYR',
        date: '2026-03-10',
        rates: { INR: 23.5 },
      }),
    });

    const provider = new FrankfurterExchangeRateProvider(baseUrl, 1000);
    const result = await provider.fetchRate('MYR', 'INR', '2026-03-10');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/2026-03-10?base=MYR&symbols=INR`,
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
    expect(result).toEqual({ rate: 23.5, rateDate: '2026-03-10' });
  });

  it('should return the provider date when it is a fallback day', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ date: '2026-03-06', rates: { INR: 88.1 } }),
    });

    const provider = new FrankfurterExchangeRateProvider(baseUrl, 1000);
    const result = await provider.fetchRate('AUD', 'INR', '2026-03-08');

    expect(result).toEqual({ rate: 88.1, rateDate: '2026-03-06' });
  });

  it('should throw ExchangeRateProviderException on a non-2xx response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    const provider = new FrankfurterExchangeRateProvider(baseUrl, 1000);

    await expect(
      provider.fetchRate('MYR', 'INR', '2026-03-10'),
    ).rejects.toBeInstanceOf(ExchangeRateProviderException);
  });

  it('should throw ExchangeRateProviderException when the target rate is missing', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ date: '2026-03-10', rates: {} }),
    });

    const provider = new FrankfurterExchangeRateProvider(baseUrl, 1000);

    await expect(
      provider.fetchRate('MYR', 'XYZ', '2026-03-10'),
    ).rejects.toBeInstanceOf(ExchangeRateProviderException);
  });

  it('should abort the request and throw when the timeout elapses', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );

    const provider = new FrankfurterExchangeRateProvider(baseUrl, 100);

    await expect(
      provider.fetchRate('MYR', 'INR', '2026-03-10'),
    ).rejects.toBeInstanceOf(ExchangeRateProviderException);
  });
});
