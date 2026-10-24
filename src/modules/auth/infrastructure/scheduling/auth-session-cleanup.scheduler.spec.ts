import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthSessionCleanupService } from '../../application/services/auth-session-cleanup.service';
import { AuthSessionCleanupScheduler } from './auth-session-cleanup.scheduler';

describe('AuthSessionCleanupScheduler', () => {
  const purgeExpiredSessions = jest.fn();
  const authSessionCleanupService = {
    purgeExpiredSessions,
  };

  const buildConfigService = (enabled: boolean, intervalMinutes: number) =>
    ({
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'auth.sessionCleanup.enabled': enabled,
          'auth.sessionCleanup.intervalMinutes': intervalMinutes,
        };

        return values[key];
      }),
    }) as unknown as ConfigService;

  const oneMinuteInMs = 60_000;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    purgeExpiredSessions.mockResolvedValue(0);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should purge expired sessions on every configured interval when enabled', async () => {
    const scheduler = new AuthSessionCleanupScheduler(
      authSessionCleanupService as unknown as AuthSessionCleanupService,
      buildConfigService(true, 15),
    );

    scheduler.onModuleInit();
    await jest.advanceTimersByTimeAsync(15 * oneMinuteInMs);

    expect(purgeExpiredSessions).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(15 * oneMinuteInMs);

    expect(purgeExpiredSessions).toHaveBeenCalledTimes(2);

    scheduler.onModuleDestroy();
  });

  it('should not start a timer when cleanup is disabled', async () => {
    const scheduler = new AuthSessionCleanupScheduler(
      authSessionCleanupService as unknown as AuthSessionCleanupService,
      buildConfigService(false, 15),
    );

    scheduler.onModuleInit();
    await jest.advanceTimersByTimeAsync(60 * oneMinuteInMs);

    expect(purgeExpiredSessions).not.toHaveBeenCalled();
  });

  it('should stop purging once the module is destroyed', async () => {
    const scheduler = new AuthSessionCleanupScheduler(
      authSessionCleanupService as unknown as AuthSessionCleanupService,
      buildConfigService(true, 1),
    );

    scheduler.onModuleInit();
    scheduler.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(10 * oneMinuteInMs);

    expect(purgeExpiredSessions).not.toHaveBeenCalled();
  });

  it('should log and keep running when a purge fails', async () => {
    purgeExpiredSessions
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValue(0);
    const scheduler = new AuthSessionCleanupScheduler(
      authSessionCleanupService as unknown as AuthSessionCleanupService,
      buildConfigService(true, 1),
    );

    scheduler.onModuleInit();
    await jest.advanceTimersByTimeAsync(oneMinuteInMs);
    await jest.advanceTimersByTimeAsync(oneMinuteInMs);

    expect(Logger.prototype.error).toHaveBeenCalledTimes(1);
    expect(purgeExpiredSessions).toHaveBeenCalledTimes(2);

    scheduler.onModuleDestroy();
  });

  it('should log how many sessions were removed when a purge deletes some', async () => {
    purgeExpiredSessions.mockResolvedValue(4);
    const scheduler = new AuthSessionCleanupScheduler(
      authSessionCleanupService as unknown as AuthSessionCleanupService,
      buildConfigService(true, 1),
    );

    scheduler.onModuleInit();
    await jest.advanceTimersByTimeAsync(oneMinuteInMs);

    expect(Logger.prototype.log).toHaveBeenCalledWith(
      'Removed 4 expired auth sessions',
      AuthSessionCleanupScheduler.name,
    );

    scheduler.onModuleDestroy();
  });
});
