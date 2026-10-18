import type { ConfigService } from '@nestjs/config';
import type { PinoLogger } from 'nestjs-pino';

import type { AppConfig } from '../../../config/app-config';
import { PrismaService } from './prisma.service';

type QueryLogging = AppConfig['monitoring']['queryLogging'];

const buildConfigService = (queryLogging: QueryLogging) => {
  const values: Record<string, unknown> = {
    secrets: { databaseUrl: 'postgresql://user:pass@localhost:5432/test' },
    database: {
      poolMax: 2,
      idleTimeoutMs: 1000,
      connectionTimeoutMs: 1000,
    },
    monitoring: {
      apiBenchmark: {
        enabled: true,
        slowRequestMs: 1000,
        criticalRequestMs: 3000,
      },
      queryLogging,
    },
  };

  return {
    getOrThrow: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService<AppConfig, true>;
};

describe('PrismaService query logging', () => {
  const logger = {
    warn: jest.fn(),
    setContext: jest.fn(),
  } as unknown as PinoLogger;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('subscribes to query events when query logging is enabled', () => {
    const on = jest
      .spyOn(PrismaService.prototype, '$on')
      .mockImplementation(() => PrismaService.prototype);

    new PrismaService(
      buildConfigService({ enabled: true, slowQueryMs: 500 }),
      logger,
    );

    expect(on).toHaveBeenCalledWith('query', expect.any(Function));
  });

  it('does not subscribe to query events when query logging is disabled', () => {
    const on = jest.spyOn(PrismaService.prototype, '$on');

    new PrismaService(
      buildConfigService({ enabled: false, slowQueryMs: 500 }),
      logger,
    );

    expect(on).not.toHaveBeenCalled();
  });
});
