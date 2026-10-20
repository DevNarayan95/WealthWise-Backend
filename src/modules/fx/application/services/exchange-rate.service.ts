import { Prisma } from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../../../config/app-config';
import { ExchangeRateProvider } from '../../domain/providers/exchange-rate-provider';
import { ExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository';
import { ExchangeRateUnavailableException } from '../../presentation/exceptions/exchange-rate-unavailable.exception';

export type ExchangeRateSource =
  'IDENTITY' | 'PROVIDER' | 'FALLBACK' | 'MANUAL';

export interface GetExchangeRateInput {
  fromCurrency: string;
  toCurrency: string;
  rateDate: string;
}

export interface ExchangeRateQuote {
  rate: number;
  rateDate: string;
  source: ExchangeRateSource;
}

export interface ConvertToBaseCurrencyInput {
  amount: string;
  fromCurrency: string;
  rateDate: string;
}

export interface BaseCurrencyConversion {
  baseCurrency: string;
  baseAmount: string;
  exchangeRate: string;
  rateDate: string;
  rateSource: ExchangeRateSource;
}

const BASE_AMOUNT_DECIMAL_PLACES = 4;
const EXCHANGE_RATE_DECIMAL_PLACES = 8;

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly provider: ExchangeRateProvider,
    private readonly repository: ExchangeRateRepository,
  ) {}

  getBaseCurrency(): string {
    return this.configService.get('exchangeRates', { infer: true })
      .baseCurrency;
  }

  async convertToBaseCurrency(
    input: ConvertToBaseCurrencyInput,
  ): Promise<BaseCurrencyConversion> {
    const baseCurrency = this.getBaseCurrency();
    const quote = await this.getRate({
      fromCurrency: input.fromCurrency,
      toCurrency: baseCurrency,
      rateDate: input.rateDate,
    });

    const rate = new Prisma.Decimal(quote.rate);

    return {
      baseCurrency,
      baseAmount: new Prisma.Decimal(input.amount)
        .mul(rate)
        .toDecimalPlaces(BASE_AMOUNT_DECIMAL_PLACES)
        .toFixed(BASE_AMOUNT_DECIMAL_PLACES),
      exchangeRate: rate.toFixed(EXCHANGE_RATE_DECIMAL_PLACES),
      rateDate: quote.rateDate,
      rateSource: quote.source,
    };
  }

  async getRate(input: GetExchangeRateInput): Promise<ExchangeRateQuote> {
    const { fromCurrency, toCurrency, rateDate } = input;

    if (fromCurrency === toCurrency) {
      return { rate: 1, rateDate, source: 'IDENTITY' };
    }

    const stored = await this.repository.findOnDate(
      fromCurrency,
      toCurrency,
      rateDate,
    );
    if (stored) {
      return {
        rate: stored.rate,
        rateDate: stored.rateDate,
        source: 'PROVIDER',
      };
    }

    try {
      const fetched = await this.provider.fetchRate(
        fromCurrency,
        toCurrency,
        rateDate,
      );
      await this.storeQuietly(
        fromCurrency,
        toCurrency,
        fetched.rateDate,
        fetched.rate,
      );
      return {
        rate: fetched.rate,
        rateDate: fetched.rateDate,
        source: 'PROVIDER',
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(
        `Exchange rate provider failed for ${fromCurrency}->${toCurrency} on ${rateDate}: ${reason}`,
      );
    }

    const latest = await this.repository.findLatestOnOrBefore(
      fromCurrency,
      toCurrency,
      rateDate,
    );
    if (latest) {
      this.logger.warn(
        `Using stored exchange rate from ${latest.rateDate} for ${fromCurrency}->${toCurrency}`,
      );
      return {
        rate: latest.rate,
        rateDate: latest.rateDate,
        source: 'FALLBACK',
      };
    }

    const { baseCurrency, manualRates } = this.configService.get(
      'exchangeRates',
      {
        infer: true,
      },
    );
    const manualRate = manualRates[fromCurrency];
    if (toCurrency === baseCurrency && manualRate !== undefined) {
      this.logger.warn(
        `Using configured manual exchange rate for ${fromCurrency}->${toCurrency}`,
      );
      return { rate: manualRate, rateDate, source: 'MANUAL' };
    }

    throw new ExchangeRateUnavailableException();
  }

  private async storeQuietly(
    fromCurrency: string,
    toCurrency: string,
    rateDate: string,
    rate: number,
  ): Promise<void> {
    try {
      await this.repository.save({ fromCurrency, toCurrency, rateDate, rate });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Failed to store exchange rate: ${reason}`);
    }
  }
}
