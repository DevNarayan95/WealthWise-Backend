import { ExchangeRateProvider } from '../../domain/providers/exchange-rate-provider';
import type { StoredExchangeRate } from '../../domain/repositories/exchange-rate.repository';
import { ExchangeRateProviderException } from './exchange-rate-provider.exception';

interface FrankfurterResponse {
  date?: string;
  rates?: Record<string, number>;
}

export class FrankfurterExchangeRateProvider extends ExchangeRateProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
  ) {
    super();
  }

  async fetchRate(
    fromCurrency: string,
    toCurrency: string,
    rateDate: string,
  ): Promise<StoredExchangeRate> {
    const query = `base=${encodeURIComponent(fromCurrency)}&symbols=${encodeURIComponent(toCurrency)}`;
    const url = `${this.baseUrl}/${rateDate}?${query}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ExchangeRateProviderException(
          `Provider responded with status ${response.status}`,
        );
      }

      const body = (await response.json()) as FrankfurterResponse;
      const rate = body.rates?.[toCurrency];

      if (typeof rate !== 'number' || typeof body.date !== 'string') {
        throw new ExchangeRateProviderException(
          'Provider response is missing the rate or date',
        );
      }

      return { rate, rateDate: body.date };
    } catch (error) {
      if (error instanceof ExchangeRateProviderException) {
        throw error;
      }

      const reason = error instanceof Error ? error.message : 'unknown error';
      throw new ExchangeRateProviderException(
        `Provider request failed: ${reason}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
