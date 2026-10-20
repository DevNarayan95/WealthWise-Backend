import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  ExchangeRateRepository,
  SaveExchangeRateInput,
  StoredExchangeRate,
} from '../../domain/repositories/exchange-rate.repository';

interface ExchangeRateRow {
  rate: { toString(): string };
  rateDate: Date;
}

function toDbDate(rateDate: string): Date {
  return new Date(`${rateDate}T00:00:00.000Z`);
}

function toStoredRate(row: ExchangeRateRow): StoredExchangeRate {
  return {
    rate: Number(row.rate.toString()),
    rateDate: row.rateDate.toISOString().slice(0, 10),
  };
}

@Injectable()
export class PrismaExchangeRateRepository extends ExchangeRateRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findOnDate(
    fromCurrency: string,
    toCurrency: string,
    rateDate: string,
  ): Promise<StoredExchangeRate | null> {
    const row = await this.prisma.exchangeRate.findUnique({
      where: {
        fromCurrency_toCurrency_rateDate: {
          fromCurrency,
          toCurrency,
          rateDate: toDbDate(rateDate),
        },
      },
    });

    return row ? toStoredRate(row) : null;
  }

  async findLatestOnOrBefore(
    fromCurrency: string,
    toCurrency: string,
    rateDate: string,
  ): Promise<StoredExchangeRate | null> {
    const row = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        rateDate: { lte: toDbDate(rateDate) },
      },
      orderBy: { rateDate: 'desc' },
    });

    return row ? toStoredRate(row) : null;
  }

  async save(input: SaveExchangeRateInput): Promise<void> {
    const key = {
      fromCurrency: input.fromCurrency,
      toCurrency: input.toCurrency,
      rateDate: toDbDate(input.rateDate),
    };

    await this.prisma.exchangeRate.upsert({
      where: { fromCurrency_toCurrency_rateDate: key },
      update: { rate: input.rate, fetchedAt: new Date() },
      create: { ...key, rate: input.rate, fetchedAt: new Date() },
    });
  }
}
