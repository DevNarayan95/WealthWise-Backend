import type { Prisma } from '../../../../prisma/generated/prisma/client';
import { createQueryLogHandler } from './query-logging';

const buildEvent = (duration: number): Prisma.QueryEvent => ({
  timestamp: new Date('2026-10-18T09:00:00Z'),
  query: 'SELECT "id" FROM "Account" WHERE "userId" = $1',
  params: '["user-secret-42"]',
  duration,
  target: 'quaint::connector::postgres',
});

describe('createQueryLogHandler', () => {
  const buildLogger = () => ({ warn: jest.fn(), debug: jest.fn() });

  it('does not log queries faster than the threshold when tracing is off', () => {
    const logger = buildLogger();
    const handle = createQueryLogHandler(logger, {
      slowQueryMs: 500,
      traceAllQueries: false,
    });

    handle(buildEvent(499));

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('logs a warning for a query at the threshold with its SQL text and timing', () => {
    const logger = buildLogger();
    const handle = createQueryLogHandler(logger, {
      slowQueryMs: 500,
      traceAllQueries: false,
    });

    handle(buildEvent(500));

    expect(logger.warn).toHaveBeenCalledWith(
      {
        durationMs: 500,
        thresholdMs: 500,
        target: 'quaint::connector::postgres',
        query: 'SELECT "id" FROM "Account" WHERE "userId" = $1',
      },
      'Slow database query',
    );
  });

  it('never logs query parameters, which can hold user data', () => {
    const logger = buildLogger();
    const handle = createQueryLogHandler(logger, {
      slowQueryMs: 0,
      traceAllQueries: true,
    });

    handle(buildEvent(900));

    const [payload] = logger.warn.mock.calls[0] as [Record<string, unknown>];
    expect(payload).not.toHaveProperty('params');
    expect(JSON.stringify(payload)).not.toContain('user-secret-42');
  });

  it('logs every query at debug level when traceAllQueries is on', () => {
    const logger = buildLogger();
    const handle = createQueryLogHandler(logger, {
      slowQueryMs: 500,
      traceAllQueries: true,
    });

    handle(buildEvent(12));

    expect(logger.debug).toHaveBeenCalledWith(
      {
        durationMs: 12,
        target: 'quaint::connector::postgres',
        query: 'SELECT "id" FROM "Account" WHERE "userId" = $1',
      },
      'Database query',
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs a slow query only at warn level, even when traceAllQueries is on', () => {
    const logger = buildLogger();
    const handle = createQueryLogHandler(logger, {
      slowQueryMs: 500,
      traceAllQueries: true,
    });

    handle(buildEvent(800));

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.debug).not.toHaveBeenCalled();
  });
});
