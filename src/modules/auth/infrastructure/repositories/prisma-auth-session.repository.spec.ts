import { PrismaAuthSessionRepository } from './prisma-auth-session.repository';

describe('PrismaAuthSessionRepository', () => {
  const prisma = {
    authSession: {
      deleteMany: jest.fn(),
    },
  };

  let repository: PrismaAuthSessionRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    repository = new PrismaAuthSessionRepository(prisma as never);
  });

  describe('deleteExpiredSessions', () => {
    it('should delete sessions that expired at or before the given time and return the count', async () => {
      const now = new Date('2026-10-24T00:00:00.000Z');
      prisma.authSession.deleteMany.mockResolvedValue({ count: 3 });

      const deleted = await repository.deleteExpiredSessions(now);

      expect(prisma.authSession.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lte: now } },
      });
      expect(deleted).toBe(3);
    });
  });
});
