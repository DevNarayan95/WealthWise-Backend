import { PrismaUserRepository } from '../../src/modules/users/infrastructure/repositories/prisma-user.repository';
import { createTestPrismaClient } from '../helpers/database/test-database';
import { cleanupDatabase } from '../helpers/database/cleanup';

describe('PrismaUserRepository (integration)', () => {
  const prisma = createTestPrismaClient();
  let repository: PrismaUserRepository;

  beforeAll(async () => {
    await prisma.$connect();

    repository = new PrismaUserRepository(prisma);
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await prisma.$disconnect();
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
