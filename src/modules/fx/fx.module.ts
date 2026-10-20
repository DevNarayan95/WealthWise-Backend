import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/app-config';
import { ExchangeRateService } from './application/services/exchange-rate.service';
import { ExchangeRateProvider } from './domain/providers/exchange-rate-provider';
import { ExchangeRateRepository } from './domain/repositories/exchange-rate.repository';
import { FrankfurterExchangeRateProvider } from './infrastructure/providers/frankfurter-exchange-rate.provider';
import { PrismaExchangeRateRepository } from './infrastructure/repositories/prisma-exchange-rate.repository';

@Module({
  providers: [
    ExchangeRateService,
    {
      provide: ExchangeRateRepository,
      useClass: PrismaExchangeRateRepository,
    },
    {
      provide: ExchangeRateProvider,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const { provider } = configService.get('exchangeRates', {
          infer: true,
        });
        return new FrankfurterExchangeRateProvider(
          provider.baseUrl,
          provider.timeoutMs,
        );
      },
    },
  ],
  exports: [ExchangeRateService],
})
export class FxModule {}
