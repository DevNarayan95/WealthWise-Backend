import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PinoLogger } from 'nestjs-pino';

import {
  Prisma,
  PrismaClient,
} from '../../../../prisma/generated/prisma/client';
import type { AppConfig } from '../../../config/app-config';
import { createQueryLogHandler } from './query-logging';

type PrismaServiceClientOptions = Prisma.PrismaClientOptions & {
  log: Prisma.LogDefinition[];
};

@Injectable()
export class PrismaService
  extends PrismaClient<PrismaServiceClientOptions>
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    configService: ConfigService<AppConfig, true>,
    logger: PinoLogger,
  ) {
    const { databaseUrl } =
      configService.getOrThrow<AppConfig['secrets']>('secrets');
    const pool = configService.getOrThrow<AppConfig['database']>('database');
    const { queryLogging } =
      configService.getOrThrow<AppConfig['monitoring']>('monitoring');

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
      max: pool.poolMax,
      idleTimeoutMillis: pool.idleTimeoutMs,
      connectionTimeoutMillis: pool.connectionTimeoutMs,
    });

    const queryEventLog: Prisma.LogDefinition = {
      emit: 'event',
      level: 'query',
    };

    super({
      adapter,
      log: queryLogging.enabled ? [queryEventLog] : [],
    });

    if (queryLogging.enabled) {
      logger.setContext(PrismaService.name);
      this.$on(
        'query',
        createQueryLogHandler(logger, {
          slowQueryMs: queryLogging.slowQueryMs,
          traceAllQueries: queryLogging.traceAllQueries,
        }),
      );
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
