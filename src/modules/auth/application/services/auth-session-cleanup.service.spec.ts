import { AuthSessionCleanupService } from './auth-session-cleanup.service';

describe('AuthSessionCleanupService', () => {
  const authSessionRepository = {
    deleteExpiredSessions: jest.fn(),
  };

  let service: AuthSessionCleanupService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-24T00:00:00.000Z'));

    service = new AuthSessionCleanupService(authSessionRepository as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('purgeExpiredSessions', () => {
    it('should delete sessions expired as of now and return how many were removed', async () => {
      authSessionRepository.deleteExpiredSessions.mockResolvedValue(5);

      const deleted = await service.purgeExpiredSessions();

      expect(authSessionRepository.deleteExpiredSessions).toHaveBeenCalledWith(
        new Date('2026-10-24T00:00:00.000Z'),
      );
      expect(deleted).toBe(5);
    });
  });
});
