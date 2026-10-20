import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../../../config/app-config';
import type { ExchangeRateProvider } from '../../domain/providers/exchange-rate-provider';
import type { ExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository';
import { ExchangeRateUnavailableException } from '../../presentation/exceptions/exchange-rate-unavailable.exception';
import { ExchangeRateService } from './exchange-rate.service';

describe('ExchangeRateService', () => {
  const rateDate = '2026-03-10';

  let provider: jest.Mocked<ExchangeRateProvider>;
  let repository: jest.Mocked<ExchangeRateRepository>;
  let manualRates: Record<string, number>;
  let service: ExchangeRateService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    provider = { fetchRate: jest.fn() };
    repository = {
      findOnDate: jest.fn().mockResolvedValue(null),
      findLatestOnOrBefore: jest.fn().mockResolvedValue(null),
      findLatest: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };

    manualRates = {};
    const configService = {
      get: jest.fn().mockImplementation(() => ({
        baseCurrency: 'INR',
        provider: {
          name: 'frankfurter',
          baseUrl: 'https://example.test',
          timeoutMs: 1000,
        },
        manualRates,
      })),
    } as unknown as ConfigService<AppConfig, true>;

    service = new ExchangeRateService(configService, provider, repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return the configured base currency', () => {
    expect(service.getBaseCurrency()).toBe('INR');
  });

  it('should convert an amount to base currency with the rate for the transaction date', async () => {
    repository.findOnDate.mockResolvedValue({ rate: 23.5, rateDate });

    const conversion = await service.convertToBaseCurrency({
      amount: '100.00',
      fromCurrency: 'MYR',
      rateDate,
    });

    expect(conversion).toEqual({
      baseCurrency: 'INR',
      baseAmount: '2350.0000',
      exchangeRate: '23.50000000',
      rateDate,
      rateSource: 'PROVIDER',
    });
  });

  it('should keep 4 decimal places of precision for large amounts', async () => {
    repository.findOnDate.mockResolvedValue({ rate: 23.5, rateDate });

    const conversion = await service.convertToBaseCurrency({
      amount: '1234567890.1234',
      fromCurrency: 'MYR',
      rateDate,
    });

    expect(conversion.baseAmount).toBe('29012345417.8999');
  });

  it('should convert with an identity rate when the currency is already the base currency', async () => {
    const conversion = await service.convertToBaseCurrency({
      amount: '50.5',
      fromCurrency: 'INR',
      rateDate,
    });

    expect(conversion).toEqual({
      baseCurrency: 'INR',
      baseAmount: '50.5000',
      exchangeRate: '1.00000000',
      rateDate,
      rateSource: 'IDENTITY',
    });
  });

  it('should return the identity rate without calling any source when currencies match', async () => {
    const quote = await service.getRate({
      fromCurrency: 'INR',
      toCurrency: 'INR',
      rateDate,
    });

    expect(quote).toEqual({ rate: 1, rateDate, source: 'IDENTITY' });
    expect(provider.fetchRate).not.toHaveBeenCalled();
    expect(repository.findOnDate).not.toHaveBeenCalled();
  });

  it('should return the stored rate for the exact date without calling the provider', async () => {
    repository.findOnDate.mockResolvedValue({ rate: 23.4, rateDate });

    const quote = await service.getRate({
      fromCurrency: 'MYR',
      toCurrency: 'INR',
      rateDate,
    });

    expect(quote).toEqual({ rate: 23.4, rateDate, source: 'PROVIDER' });
    expect(provider.fetchRate).not.toHaveBeenCalled();
  });

  it('should fetch from the provider, store the rate, and return it as PROVIDER', async () => {
    provider.fetchRate.mockResolvedValue({ rate: 23.5, rateDate });

    const quote = await service.getRate({
      fromCurrency: 'MYR',
      toCurrency: 'INR',
      rateDate,
    });

    expect(provider.fetchRate).toHaveBeenCalledWith('MYR', 'INR', rateDate);
    expect(repository.save).toHaveBeenCalledWith({
      fromCurrency: 'MYR',
      toCurrency: 'INR',
      rateDate,
      rate: 23.5,
    });
    expect(quote).toEqual({ rate: 23.5, rateDate, source: 'PROVIDER' });
  });

  it('should still return the provider rate when storing it fails', async () => {
    provider.fetchRate.mockResolvedValue({ rate: 23.5, rateDate });
    repository.save.mockRejectedValue(new Error('db down'));

    const quote = await service.getRate({
      fromCurrency: 'MYR',
      toCurrency: 'INR',
      rateDate,
    });

    expect(quote).toEqual({ rate: 23.5, rateDate, source: 'PROVIDER' });
  });

  it('should use the provider date when it differs from the requested date (weekend or holiday)', async () => {
    provider.fetchRate.mockResolvedValue({
      rate: 88.1,
      rateDate: '2026-03-06',
    });

    const quote = await service.getRate({
      fromCurrency: 'AUD',
      toCurrency: 'INR',
      rateDate,
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ rateDate: '2026-03-06' }),
    );
    expect(quote).toEqual({
      rate: 88.1,
      rateDate: '2026-03-06',
      source: 'PROVIDER',
    });
  });

  it('should fall back to the most recent stored rate when the provider fails', async () => {
    provider.fetchRate.mockRejectedValue(new Error('timeout'));
    repository.findLatestOnOrBefore.mockResolvedValue({
      rate: 22.9,
      rateDate: '2026-03-05',
    });

    const quote = await service.getRate({
      fromCurrency: 'MYR',
      toCurrency: 'INR',
      rateDate,
    });

    expect(repository.findLatestOnOrBefore).toHaveBeenCalledWith(
      'MYR',
      'INR',
      rateDate,
    );
    expect(quote).toEqual({
      rate: 22.9,
      rateDate: '2026-03-05',
      source: 'FALLBACK',
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should use the most recent stored rate after the date when no earlier rate exists', async () => {
    provider.fetchRate.mockRejectedValue(new Error('down'));
    repository.findLatest.mockResolvedValue({
      rate: 24.1,
      rateDate: '2026-04-01',
    });

    const quote = await service.getRate({
      fromCurrency: 'MYR',
      toCurrency: 'INR',
      rateDate,
    });

    expect(repository.findLatest).toHaveBeenCalledWith('MYR', 'INR');
    expect(quote).toEqual({
      rate: 24.1,
      rateDate: '2026-04-01',
      source: 'FALLBACK',
    });
  });

  it('should prefer a stored rate over the configured manual rate', async () => {
    provider.fetchRate.mockRejectedValue(new Error('down'));
    manualRates = { MYR: 23.0 };
    repository.findLatest.mockResolvedValue({
      rate: 24.1,
      rateDate: '2026-04-01',
    });

    const quote = await service.getRate({
      fromCurrency: 'MYR',
      toCurrency: 'INR',
      rateDate,
    });

    expect(quote.source).toBe('FALLBACK');
    expect(quote.rate).toBe(24.1);
  });

  it('should use the configured manual rate when no provider or stored rate is available', async () => {
    provider.fetchRate.mockRejectedValue(new Error('down'));
    manualRates = { MYR: 23.0 };

    const quote = await service.getRate({
      fromCurrency: 'MYR',
      toCurrency: 'INR',
      rateDate,
    });

    expect(quote).toEqual({ rate: 23.0, rateDate, source: 'MANUAL' });
  });

  it('should not use a manual rate when the target currency is not the base currency', async () => {
    provider.fetchRate.mockRejectedValue(new Error('down'));
    manualRates = { MYR: 5.1 };

    await expect(
      service.getRate({ fromCurrency: 'MYR', toCurrency: 'AUD', rateDate }),
    ).rejects.toBeInstanceOf(ExchangeRateUnavailableException);
  });

  it('should throw ExchangeRateUnavailableException when every source fails', async () => {
    provider.fetchRate.mockRejectedValue(new Error('down'));

    await expect(
      service.getRate({ fromCurrency: 'AUD', toCurrency: 'INR', rateDate }),
    ).rejects.toBeInstanceOf(ExchangeRateUnavailableException);
  });
});
