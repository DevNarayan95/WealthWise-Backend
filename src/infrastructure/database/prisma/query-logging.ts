import type { PinoLogger } from 'nestjs-pino';

import type { Prisma } from '../../../../prisma/generated/prisma/client';

type QueryLogger = Pick<PinoLogger, 'warn' | 'debug'>;

export interface QueryLogOptions {
  slowQueryMs: number;
  traceAllQueries: boolean;
}

/**
 * Query params are deliberately left out: they contain user values such as
 * emails and password hashes. The SQL text uses placeholders, so it is safe.
 *
 * Each entry is written through the PinoLogger, so it carries the request ID
 * of the request that ran the query.
 */
export const createQueryLogHandler =
  (logger: QueryLogger, options: QueryLogOptions) =>
  (event: Prisma.QueryEvent): void => {
    const fields = {
      durationMs: event.duration,
      target: event.target,
      query: event.query,
    };

    if (event.duration >= options.slowQueryMs) {
      logger.warn(
        { ...fields, thresholdMs: options.slowQueryMs },
        'Slow database query',
      );
      return;
    }

    if (options.traceAllQueries) {
      logger.debug(fields, 'Database query');
    }
  };
