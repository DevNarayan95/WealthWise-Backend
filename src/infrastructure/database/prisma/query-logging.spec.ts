import type { Prisma } from '../../../../prisma/generated/prisma/client';
import { createSlowQueryHandler } from './query-logging';

const buildEvent = (duration: number): Prisma.QueryEvent => ({
  timestamp: new Date('2026-10-18T09:00:00Z'),
  query: 'SELECT "id" FROM "Account" WHERE "userId" = $1',
  params: '["user-secret-42"]',
  duration,
  target: 'quaint::connector::postgres',
});

describe('createSlowQueryHandler', () => {
  const buildLogger = () => ({ warn: jest.fn() });

  it('does not log queries faster than the threshold', () => {
    const logger = buildLogger();
    const handle = createSlowQueryHandler(logger, 500);

    handle(buildEvent(499));

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs a warning for a query at the threshold with its SQL text and timing', () => {
    const logger = buildLogger();
    const handle = createSlowQueryHandler(logger, 500);

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
    const handle = createSlowQueryHandler(logger, 0);

    handle(buildEvent(900));

    const [payload] = logger.warn.mock.calls[0] as [Record<string, unknown>];
    expect(payload).not.toHaveProperty('params');
    expect(JSON.stringify(payload)).not.toContain('user-secret-42');
  });
});
