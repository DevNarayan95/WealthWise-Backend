import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';

import type { AppConfig } from '../../config/app-config';
import { Public } from '../../common/decorators/public.decorator';
import { ApplicationException } from '../../common/exceptions/application.exception';
import { ErrorCode } from '../../common/constants/error-code.constant';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

const SERVICE_NAME = 'wealthwise-backend';

@Public()
@Controller({
  path: 'health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  private readonly databaseTimeoutMs: number;

  constructor(
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    configService: ConfigService<AppConfig, true>,
  ) {
    this.databaseTimeoutMs =
      configService.getOrThrow<AppConfig['health']>('health').databaseTimeoutMs;
  }

  /**
   * Liveness: the process is up and able to serve HTTP.
   * Does not touch dependencies, so a DB outage never restarts the pod.
   */
  @Get('live')
  live() {
    return {
      status: 'ok',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness: the service can serve traffic, including a bounded DB round trip.
   */
  @Get('ready')
  async ready() {
    const startedAt = Date.now();

    try {
      await this.withTimeout(
        this.prisma.$queryRaw`SELECT 1;`,
        this.databaseTimeoutMs,
      );
    } catch (error: unknown) {
      this.logger.warn({ err: error }, 'Readiness check failed');

      throw new ApplicationException(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Service is not ready to accept traffic',
        503,
      );
    }

    return {
      status: 'ok',
      service: SERVICE_NAME,
      database: {
        status: 'connected',
        latencyMs: Date.now() - startedAt,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(new Error(`Database check timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}
