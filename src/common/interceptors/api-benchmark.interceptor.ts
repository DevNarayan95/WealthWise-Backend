import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { Observable, finalize, tap } from 'rxjs';

import type { AppConfig } from '../../config/app-config';
import {
  classifyDuration,
  type DurationClassification,
} from '../monitoring/duration-classifier';

type BenchmarkOutcome = 'success' | 'error';

const UNMATCHED_ROUTE = 'unmatched';

const resolveRoute = (request: Request): string => {
  const route: unknown = request.route;
  const path = (route as { path?: unknown } | undefined)?.path;

  return typeof path === 'string' ? path : UNMATCHED_ROUTE;
};

const extractErrorCode = (error: unknown): string | undefined => {
  if (!(error instanceof HttpException)) {
    return undefined;
  }

  const body = error.getResponse();

  return typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    typeof body.code === 'string'
    ? body.code
    : undefined;
};

/**
 * Logs only slow and critical requests. Normal requests are already recorded
 * with their duration by pino-http, so they are not repeated here.
 */
@Injectable()
export class ApiBenchmarkInterceptor implements NestInterceptor {
  private readonly enabled: boolean;
  private readonly slowMs: number;
  private readonly criticalMs: number;

  constructor(
    configService: ConfigService<AppConfig, true>,
    private readonly logger: PinoLogger,
  ) {
    const { apiBenchmark } =
      configService.getOrThrow<AppConfig['monitoring']>('monitoring');

    this.logger.setContext(ApiBenchmarkInterceptor.name);
    this.enabled = apiBenchmark.enabled;
    this.slowMs = apiBenchmark.slowRequestMs;
    this.criticalMs = apiBenchmark.criticalRequestMs;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.enabled || context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const startedAt = performance.now();
    let outcome: BenchmarkOutcome = 'success';
    let errorCode: string | undefined;

    return next.handle().pipe(
      tap({
        error: (error: unknown) => {
          outcome = 'error';
          errorCode = extractErrorCode(error);
        },
      }),
      finalize(() => {
        this.report(request, performance.now() - startedAt, outcome, errorCode);
      }),
    );
  }

  private report(
    request: Request,
    elapsedMs: number,
    outcome: BenchmarkOutcome,
    errorCode: string | undefined,
  ): void {
    const durationMs = Math.round(elapsedMs);
    const classification = classifyDuration(durationMs, {
      slowMs: this.slowMs,
      criticalMs: this.criticalMs,
    });

    if (classification === 'normal') {
      return;
    }

    const payload = {
      requestId: request.id,
      method: request.method,
      route: resolveRoute(request),
      durationMs,
      classification,
      outcome,
      ...(errorCode ? { errorCode } : {}),
    };

    this.write(classification, payload);
  }

  private write(
    classification: DurationClassification,
    payload: Record<string, unknown>,
  ): void {
    if (classification === 'critical') {
      this.logger.error(payload, 'Critical API request');
      return;
    }

    this.logger.warn(payload, 'Slow API request');
  }
}
