import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { appConfiguration, type AppConfig } from './config/app-config';
import { loggingModule } from './config/logging.config';
import { ApiClientGuard } from './infrastructure/security/api-client.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ApiBenchmarkInterceptor } from './common/interceptors/api-benchmark.interceptor';
import { RequestStartLogMiddleware } from './common/middleware/request-start-log.middleware';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { MailModule } from './infrastructure/mail/mail.module';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { IncomeModule } from './modules/income/income.module';
import { ExpensesModule } from './modules/expenses/expenses.module';

@Module({
  imports: [
    loggingModule,

    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfiguration],
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const throttle =
          configService.getOrThrow<AppConfig['security']>('security').throttle;

        return {
          throttlers: [
            {
              name: 'default',
              ttl: throttle.ttlMs,
              limit: throttle.defaultLimit,
            },
          ],
        };
      },
    }),

    PrismaModule,
    DatabaseModule,
    MailModule,
    HealthModule,
    UsersModule,
    AuthModule,
    AccountsModule,
    IncomeModule,
    ExpensesModule,
    TransactionsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiClientGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiBenchmarkInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestStartLogMiddleware).forRoutes('*');
  }
}
