import type { PinoLogger } from 'nestjs-pino';

import type { Prisma } from '../../../../prisma/generated/prisma/client';

type SlowQueryWarn = Pick<PinoLogger, 'warn'>;

/**
 * Query params are deliberately left out: they contain user values such as
 * emails and password hashes. The SQL text uses placeholders, so it is safe.
 */
export const createSlowQueryHandler =
  (logger: SlowQueryWarn, slowQueryMs: number) =>
  (event: Prisma.QueryEvent): void => {
    if (event.duration < slowQueryMs) {
      return;
    }

    logger.warn(
      {
        durationMs: event.duration,
        thresholdMs: slowQueryMs,
        target: event.target,
        query: event.query,
      },
      'Slow database query',
    );
  };
