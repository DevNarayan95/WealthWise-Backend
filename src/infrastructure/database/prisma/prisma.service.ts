import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../../../prisma/generated/prisma/client';
import type { AppConfig } from '../../../config/app-config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService<AppConfig, true>) {
    const { databaseUrl } =
      configService.getOrThrow<AppConfig['secrets']>('secrets');
    const pool = configService.getOrThrow<AppConfig['database']>('database');

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
      max: pool.poolMax,
      idleTimeoutMillis: pool.idleTimeoutMs,
      connectionTimeoutMillis: pool.connectionTimeoutMs,
    });

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
