import { CallHandler, ExecutionContext, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PinoLogger } from 'nestjs-pino';
import { lastValueFrom, of, throwError } from 'rxjs';

import type { AppConfig } from '../../config/app-config';
import { ErrorCode } from '../constants/error-code.constant';
import { ApplicationException } from '../exceptions/application.exception';
import { ApiBenchmarkInterceptor } from './api-benchmark.interceptor';

type ApiBenchmarkConfig = AppConfig['monitoring']['apiBenchmark'];

const buildInterceptor = (apiBenchmark: ApiBenchmarkConfig) => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue({
      apiBenchmark,
      queryLogging: { enabled: false, slowQueryMs: 500 },
    }),
  } as unknown as ConfigService<AppConfig, true>;

  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
    setContext: jest.fn(),
  };
  const interceptor = new ApiBenchmarkInterceptor(
    configService,
    logger as unknown as PinoLogger,
  );

  return { interceptor, logger };
};

const buildContext = (type: string = 'http'): ExecutionContext => {
  const request = {
    id: 'req-42',
    method: 'GET',
    path: '/api/v1/accounts/acc-7',
    route: { path: '/api/v1/accounts/:id' },
  };
  const response = { statusCode: HttpStatus.OK };

  return {
    getType: () => type,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
};

const handlerReturning = (value: unknown): CallHandler =>
  ({ handle: () => of(value) }) as CallHandler;

const handlerThrowing = (error: unknown): CallHandler =>
  ({ handle: () => throwError(() => error) }) as CallHandler;

const enabledConfig: ApiBenchmarkConfig = {
  enabled: true,
  slowRequestMs: 1000,
  criticalRequestMs: 3000,
};

const mockDuration = (durationMs: number): void => {
  jest
    .spyOn(performance, 'now')
    .mockReturnValueOnce(0)
    .mockReturnValueOnce(durationMs);
};

describe('ApiBenchmarkInterceptor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not time or log anything when benchmarking is disabled', async () => {
    const { interceptor, logger } = buildInterceptor({
      ...enabledConfig,
      enabled: false,
    });
    const now = jest.spyOn(performance, 'now');

    const result = await lastValueFrom(
      interceptor.intercept(buildContext(), handlerReturning({ ok: true })),
    );

    expect(result).toEqual({ ok: true });
    expect(now).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('passes through non-HTTP contexts without logging', async () => {
    const { interceptor, logger } = buildInterceptor(enabledConfig);
    mockDuration(5000);

    await lastValueFrom(
      interceptor.intercept(buildContext('rpc'), handlerReturning('value')),
    );

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('does not log requests faster than the slow threshold', async () => {
    const { interceptor, logger } = buildInterceptor(enabledConfig);
    mockDuration(999);

    await lastValueFrom(
      interceptor.intercept(buildContext(), handlerReturning('value')),
    );

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs a warning with request details for a slow request', async () => {
    const { interceptor, logger } = buildInterceptor(enabledConfig);
    mockDuration(1500);

    await lastValueFrom(
      interceptor.intercept(buildContext(), handlerReturning('value')),
    );

    expect(logger.warn).toHaveBeenCalledWith(
      {
        requestId: 'req-42',
        method: 'GET',
        route: '/api/v1/accounts/:id',
        durationMs: 1500,
        classification: 'slow',
        outcome: 'success',
      },
      'Slow API request',
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs an error for a critical request', async () => {
    const { interceptor, logger } = buildInterceptor(enabledConfig);
    mockDuration(3000);

    await lastValueFrom(
      interceptor.intercept(buildContext(), handlerReturning('value')),
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMs: 3000,
        classification: 'critical',
      }),
      'Critical API request',
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('records the error outcome and error code, and rethrows the original error', async () => {
    const { interceptor, logger } = buildInterceptor(enabledConfig);
    mockDuration(1200);
    const failure = new ApplicationException(
      ErrorCode.ACCOUNT_NOT_FOUND,
      'Account not found',
      HttpStatus.NOT_FOUND,
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(buildContext(), handlerThrowing(failure)),
      ),
    ).rejects.toBe(failure);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'error',
        errorCode: ErrorCode.ACCOUNT_NOT_FOUND,
      }),
      'Slow API request',
    );
  });

  it('logs the route pattern and never the raw URL', async () => {
    const { interceptor, logger } = buildInterceptor(enabledConfig);
    mockDuration(1500);

    await lastValueFrom(
      interceptor.intercept(buildContext(), handlerReturning('value')),
    );

    const [payload] = logger.warn.mock.calls[0] as [Record<string, unknown>];
    expect(payload).not.toHaveProperty('path');
    expect(payload).not.toHaveProperty('url');
    expect(payload.route).toBe('/api/v1/accounts/:id');
  });
});
