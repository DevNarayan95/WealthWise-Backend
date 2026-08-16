import { PrismaUserRepository } from '../../src/modules/users/repositories/prisma-user.repository';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';

describe('PrismaUserRepository (integration)', () => {
  let prisma: PrismaService | undefined;
  let repository: PrismaUserRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();

    repository = new PrismaUserRepository(prisma);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('should create a user', async () => {
    const email = `integration-${Date.now()}@example.com`;

    const user = await repository.create({
      email,
      passwordHash: 'test-password-hash',
      firstName: 'Integration',
      lastName: 'Test',
    });

    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.email).toBe(email);
    expect(user.firstName).toBe('Integration');
    expect(user.lastName).toBe('Test');
  });

  it('should find a user by email', async () => {
    const email = `find-email-${Date.now()}@example.com`;

    await repository.create({
      email,
      passwordHash: 'test-password-hash',
      firstName: 'Find',
      lastName: 'Email',
    });

    const user = await repository.findByEmail(email);

    expect(user).not.toBeNull();
    expect(user?.email).toBe(email);
  });

  it('should find a user by id', async () => {
    const email = `find-id-${Date.now()}@example.com`;

    const createdUser = await repository.create({
      email,
      passwordHash: 'test-password-hash',
      firstName: 'Find',
      lastName: 'Id',
    });

    const user = await repository.findById(createdUser.id);

    expect(user).not.toBeNull();
    expect(user?.id).toBe(createdUser.id);
  });

  it('should return null when email does not exist', async () => {
    const user = await repository.findByEmail(
      `does-not-exist-${Date.now()}@example.com`,
    );

    expect(user).toBeNull();
  });

  it('should return null when id does not exist', async () => {
    const user = await repository.findById(
      '00000000-0000-0000-0000-000000000000',
    );

    expect(user).toBeNull();
  });
});
