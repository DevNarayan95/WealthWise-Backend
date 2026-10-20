import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createAccessToken } from './support/access-token';
import bcrypt from 'bcrypt';
import request from './support/api-request';

import type { Prisma } from '../../prisma/generated/prisma/client';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';

describe('Authorization (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminEmail = process.env.SEED_ADMIN_EMAIL!;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD!;

  let normalUserId: string;
  let normalUserEmail: string;

  const testAccountNamePrefix = 'Authz test ';

  const removeAccounts = async (
    where: Prisma.AccountWhereInput,
  ): Promise<void> => {
    const accounts = await prisma.account.findMany({
      where,
      select: { id: true },
    });
    const accountIds = accounts.map((account) => account.id);

    await prisma.transaction.deleteMany({
      where: { accountId: { in: accountIds } },
    });
    await prisma.account.deleteMany({
      where: { id: { in: accountIds } },
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api');

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);

    normalUserEmail = `authorization-test-${Date.now()}@example.com`;

    const passwordHash = await bcrypt.hash('TestPassword123!', 12);

    const normalUser = await prisma.user.create({
      data: {
        email: normalUserEmail,
        passwordHash,
        firstName: 'Authorization',
        lastName: 'Test',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    normalUserId = normalUser.id;
  });

  afterAll(async () => {
    await removeAccounts({ name: { startsWith: testAccountNamePrefix } });

    if (normalUserId) {
      await prisma.user.delete({
        where: {
          id: normalUserId,
        },
      });
    }

    await app.close();
  });

  describe('POST /api/v1/accounts (accounts:create permission)', () => {
    it('should allow the super admin to create an account', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        })
        .expect(200);

      const accessToken = loginResponse.body.data.accessToken;

      const response = await request(app.getHttpServer())
        .post('/api/v1/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `${testAccountNamePrefix}admin ${Date.now()}`,
          type: 'BANK_ACCOUNT',
          currency: 'MYR',
          openingBalance: '0.0000',
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.stringMatching(/^Authz test admin /),
        }),
      );
    });

    it('should reject an authenticated user without accounts:create permission', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: normalUserEmail,
          password: 'TestPassword123!',
        })
        .expect(200);

      const accessToken = loginResponse.body.data.accessToken;

      const response = await request(app.getHttpServer())
        .post('/api/v1/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `${testAccountNamePrefix}unauthorized ${Date.now()}`,
          type: 'BANK_ACCOUNT',
          currency: 'MYR',
          openingBalance: '0.0000',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('permission isolation', () => {
    it('should not grant permissions to a user without roles', async () => {
      const permissions = await prisma.rolePermission.findMany({
        where: {
          role: {
            users: {
              some: {
                userId: normalUserId,
              },
            },
          },
        },
        include: {
          permission: true,
        },
      });

      expect(permissions).toHaveLength(0);
    });
  });

  describe('JWT authentication and authorization', () => {
    it('should reject a valid JWT when the user lacks the required permission', async () => {
      const token = await createAccessToken(app, {
        userId: normalUserId,
        email: normalUserEmail,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `${testAccountNamePrefix}jwt ${Date.now()}`,
          type: 'BANK_ACCOUNT',
          currency: 'MYR',
          openingBalance: '0.0000',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  it('should reject a previously authorized JWT after the required permission is revoked', async () => {
    const permission = await prisma.permission.findUniqueOrThrow({
      where: {
        resource_action: {
          resource: 'accounts',
          action: 'create',
        },
      },
    });

    // A dedicated role and user keep the revocation isolated from the shared seeded admin role.
    const revocationRole = await prisma.role.create({
      data: {
        name: `revocation-role-${Date.now()}`,
        description: 'Throwaway role for the permission revocation test',
      },
    });

    const revocableUser = await prisma.user.create({
      data: {
        email: `revocable-${Date.now()}@example.com`,
        passwordHash: await bcrypt.hash('TestPassword123!', 12),
        firstName: 'Revocable',
        lastName: 'User',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    try {
      await prisma.userRole.create({
        data: {
          userId: revocableUser.id,
          roleId: revocationRole.id,
        },
      });

      await prisma.rolePermission.create({
        data: {
          roleId: revocationRole.id,
          permissionId: permission.id,
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: revocableUser.email,
          password: 'TestPassword123!',
        })
        .expect(200);

      const accessToken = loginResponse.body.data.accessToken;

      await request(app.getHttpServer())
        .post('/api/v1/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `${testAccountNamePrefix}authorized ${Date.now()}`,
          type: 'BANK_ACCOUNT',
          currency: 'MYR',
          openingBalance: '0.0000',
        })
        .expect(201);

      await prisma.rolePermission.delete({
        where: {
          roleId_permissionId: {
            roleId: revocationRole.id,
            permissionId: permission.id,
          },
        },
      });

      await request(app.getHttpServer())
        .post('/api/v1/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `${testAccountNamePrefix}revoked ${Date.now()}`,
          type: 'BANK_ACCOUNT',
          currency: 'MYR',
          openingBalance: '0.0000',
        })
        .expect(403);
    } finally {
      await removeAccounts({ userId: revocableUser.id });

      await prisma.user.deleteMany({
        where: {
          id: revocableUser.id,
        },
      });

      await prisma.role.deleteMany({
        where: {
          id: revocationRole.id,
        },
      });
    }
  });
});
