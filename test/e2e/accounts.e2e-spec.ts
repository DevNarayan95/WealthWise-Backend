import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createAccessToken } from './support/access-token';
import { binaryParser } from './support/binary-parser';
import request from './support/api-request';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';
import { UserStatus } from '../../prisma/generated/prisma/client';

// Seeds bypass the service, so FX fields use a labelled MANUAL rate instead of a provider lookup.
const SEED_EXCHANGE_RATE = 20;

const seedFxFields = (amount: string, rateDate: Date) => ({
  baseCurrency: 'INR',
  baseAmount: (Number(amount) * SEED_EXCHANGE_RATE).toFixed(4),
  exchangeRate: SEED_EXCHANGE_RATE.toFixed(8),
  rateDate,
  rateSource: 'MANUAL' as const,
});

describe('Accounts (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let authorizedUserToken: string;
  let unauthorizedUserToken: string;

  let authorizedUserId: string;
  let unauthorizedUserId: string;

  let secondAuthorizedUserToken: string;
  let secondAuthorizedUserId: string;

  const testPrefix = `accounts-e2e-${Date.now()}`;

  const cleanupTestAccounts = async (): Promise<void> => {
    await prisma.transaction.deleteMany({
      where: {
        account: {
          userId: {
            in: [authorizedUserId, secondAuthorizedUserId],
          },
        },
      },
    });

    await prisma.account.deleteMany({
      where: {
        userId: {
          in: [authorizedUserId, secondAuthorizedUserId],
        },
      },
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

    /**
     * Generate JWT for seeded Super Admin.
     */
    const superAdmin = await prisma.user.findUnique({
      where: {
        email: process.env.SEED_ADMIN_EMAIL!,
      },
    });

    if (!superAdmin) {
      throw new Error('Super Admin user not found. Run npm run db:seed:test');
    }

    const superAdminPermissions = await prisma.rolePermission.findMany({
      where: {
        role: {
          users: {
            some: {
              userId: superAdmin.id,
            },
          },
        },
      },
      include: {
        permission: true,
      },
    });

    const superAdminPermissionNames = superAdminPermissions.map(
      ({ permission }) => `${permission.resource}:${permission.action}`,
    );

    expect(superAdminPermissionNames).toContain('accounts:create');
    expect(superAdminPermissionNames).toContain('accounts:read');

    /**
     * Use the seeded ACCOUNT_MANAGER role, which holds accounts:create,
     * accounts:read and accounts:update. Selecting by name keeps the
     * test deterministic; a permission-based lookup could match CUSTOMER
     * or SUPER_ADMIN depending on row order.
     */
    const accountsRole = await prisma.role.findUnique({
      where: {
        name: 'ACCOUNT_MANAGER',
      },
    });

    if (!accountsRole) {
      throw new Error('Seeded ACCOUNT_MANAGER role was not found.');
    }

    /**
     * Create a dedicated authorized E2E user.
     */
    const authorizedUser = await prisma.user.create({
      data: {
        email: `${testPrefix}-authorized@example.com`,
        passwordHash: 'e2e-test-password-hash',
        firstName: 'Accounts',
        lastName: 'Authorized',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    authorizedUserId = authorizedUser.id;

    await prisma.userRole.create({
      data: {
        userId: authorizedUser.id,
        roleId: accountsRole.id,
      },
    });

    const authorizedPermissions = await prisma.rolePermission.findMany({
      where: {
        roleId: accountsRole.id,
      },
      include: {
        permission: true,
      },
    });

    const authorizedPermissionNames = authorizedPermissions.map(
      ({ permission }) => `${permission.resource}:${permission.action}`,
    );

    expect(authorizedPermissionNames).toContain('accounts:create');
    expect(authorizedPermissionNames).toContain('accounts:read');
    expect(authorizedPermissionNames).toContain('accounts:update');

    authorizedUserToken = await createAccessToken(app, {
      userId: authorizedUser.id,
      email: authorizedUser.email,
    });

    const secondAuthorizedUser = await prisma.user.create({
      data: {
        email: `${testPrefix}-second-authorized@example.com`,
        passwordHash: 'e2e-test-password-hash',
        firstName: 'Accounts',
        lastName: 'SecondAuthorized',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    secondAuthorizedUserId = secondAuthorizedUser.id;

    await prisma.userRole.create({
      data: {
        userId: secondAuthorizedUser.id,
        roleId: accountsRole.id,
      },
    });

    secondAuthorizedUserToken = await createAccessToken(app, {
      userId: secondAuthorizedUser.id,
      email: secondAuthorizedUser.email,
    });

    /**
     * Create a user without any roles.
     *
     * This user is used to verify the PermissionsGuard returns 403.
     */
    const unauthorizedUser = await prisma.user.create({
      data: {
        email: `${testPrefix}-unauthorized@example.com`,
        passwordHash: 'e2e-test-password-hash',
        firstName: 'Accounts',
        lastName: 'Unauthorized',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    unauthorizedUserId = unauthorizedUser.id;

    unauthorizedUserToken = await createAccessToken(app, {
      userId: unauthorizedUser.id,
      email: unauthorizedUser.email,
    });
  });

  beforeEach(async () => {
    await cleanupTestAccounts();
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({
      where: {
        account: {
          userId: {
            in: [authorizedUserId, secondAuthorizedUserId, unauthorizedUserId],
          },
        },
      },
    });

    /**
     * Remove only data created by this E2E suite.
     */
    await prisma.account.deleteMany({
      where: {
        OR: [
          {
            userId: authorizedUserId,
          },
          {
            userId: unauthorizedUserId,
          },
        ],
      },
    });

    if (authorizedUserId) {
      await prisma.userRole.deleteMany({
        where: {
          userId: authorizedUserId,
        },
      });

      await prisma.user.delete({
        where: {
          id: authorizedUserId,
        },
      });
    }

    if (secondAuthorizedUserId) {
      await prisma.account.deleteMany({
        where: {
          userId: secondAuthorizedUserId,
        },
      });

      await prisma.userRole.deleteMany({
        where: {
          userId: secondAuthorizedUserId,
        },
      });

      await prisma.user.delete({
        where: {
          id: secondAuthorizedUserId,
        },
      });
    }

    if (unauthorizedUserId) {
      await prisma.userRole.deleteMany({
        where: {
          userId: unauthorizedUserId,
        },
      });

      await prisma.user.delete({
        where: {
          id: unauthorizedUserId,
        },
      });
    }

    await app.close();
  });

  /**
   * Helper for creating accounts through the real HTTP API.
   */
  const createAccount = (
    token: string,
    overrides:
      | Partial<{
          name: string;
          type: string;
          currency: string;
          openingBalance: string;
        }>
      | Record<string, unknown> = {},
  ) => {
    return request(app.getHttpServer())
      .post('/api/v1/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${testPrefix}-account`,
        type: 'BANK_ACCOUNT',
        currency: 'MYR',
        openingBalance: '1000.50',
        ...overrides,
      });
  };

  const createTransaction = (
    accountId: string,
    type: 'INCOME' | 'EXPENSE',
    amount: string,
    transactionDate = new Date('2026-08-15T12:00:00.000Z'),
  ) => {
    return prisma.transaction.create({
      data: {
        accountId,
        type,
        amount,
        currency: 'MYR',
        transactionDate,
        ...seedFxFields(amount, transactionDate),
      },
    });
  };

  describe('Authentication', () => {
    it('should reject listing accounts without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject getting an account without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts/4990c246-06bf-4a81-9c23-62e8265e895f')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject creating an account without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/accounts')
        .send({
          name: `${testPrefix}-unauthenticated`,
          type: 'BANK_ACCOUNT',
          currency: 'MYR',
          openingBalance: '1000',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject archiving an account without authentication', async () => {
      const created = await createAccount(authorizedUserToken).expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/accounts/${created.body.data.id}/archive`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authorization', () => {
    it('should reject account creation without accounts:create permission', async () => {
      const response = await createAccount(unauthorizedUserToken).expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should reject account listing without accounts:read permission', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${unauthorizedUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should reject account lookup without accounts:read permission', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts/4990c246-06bf-4a81-9c23-62e8265e895f')
        .set('Authorization', `Bearer ${unauthorizedUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should reject account archiving without accounts:update permission', async () => {
      const created = await createAccount(authorizedUserToken).expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/accounts/${created.body.data.id}/archive`)
        .set('Authorization', `Bearer ${unauthorizedUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/accounts', () => {
    it('should create an account successfully', async () => {
      const response = await createAccount(authorizedUserToken).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.meta).toEqual({});

      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.stringContaining(testPrefix),
          type: 'BANK_ACCOUNT',
          currency: 'MYR',
          openingBalance: '1000.5',
          status: 'ACTIVE',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );

      expect(response.body.data.userId).toBeUndefined();
      expect(response.body.data.passwordHash).toBeUndefined();
    });

    it('should trim account name', async () => {
      const response = await createAccount(authorizedUserToken, {
        name: `  ${testPrefix}-trimmed  `,
      }).expect(201);

      expect(response.body.data.name).toBe(`${testPrefix}-trimmed`);
    });

    it('should normalize currency to uppercase', async () => {
      const response = await createAccount(authorizedUserToken, {
        currency: 'myr',
      }).expect(201);

      expect(response.body.data.currency).toBe('MYR');
    });

    it('should accept a negative opening balance', async () => {
      const response = await createAccount(authorizedUserToken, {
        type: 'CREDIT_CARD',
        openingBalance: '-1250.5',
      }).expect(201);

      expect(response.body.data.openingBalance).toBe('-1250.5');
    });

    it.each([
      'SAVINGS',
      'CURRENT',
      'WALLET',
      'FIXED_DEPOSIT',
      'RECURRING_DEPOSIT',
    ])('should create an account of type %s', async (type) => {
      const response = await createAccount(authorizedUserToken, {
        type,
      }).expect(201);

      expect(response.body.data.type).toBe(type);
    });

    it('should reject a missing account name', async () => {
      const response = await createAccount(authorizedUserToken, {
        name: '',
      }).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject an invalid account type', async () => {
      const response = await createAccount(authorizedUserToken, {
        type: 'INVALID_TYPE',
      }).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject an invalid currency', async () => {
      const response = await createAccount(authorizedUserToken, {
        currency: 'MY',
      }).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject an invalid opening balance', async () => {
      const response = await createAccount(authorizedUserToken, {
        openingBalance: '12.12345',
      }).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject scientific notation for opening balance', async () => {
      const response = await createAccount(authorizedUserToken, {
        openingBalance: '1e3',
      }).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject unexpected fields', async () => {
      const payload: Record<string, unknown> = {
        unexpectedField: 'not-allowed',
      };
      const response = await createAccount(authorizedUserToken, payload).expect(
        400,
      );

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/accounts', () => {
    it('should return accounts belonging to the authenticated user', async () => {
      const created = await createAccount(authorizedUserToken).expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      expect(response.body.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: created.body.data.id,
            name: created.body.data.name,
          }),
        ]),
      );

      expect(response.body.data.items[0].userId).toBeUndefined();

      expect(response.body.meta).toEqual(
        expect.objectContaining({
          page: 1,
          limit: 20,
          total: expect.any(Number),
          totalPages: expect.any(Number),
        }),
      );
    });

    it('should use default pagination values', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(20);
    });

    it('should support custom page and limit', async () => {
      for (let index = 0; index < 25; index += 1) {
        await createAccount(authorizedUserToken, {
          name: `${testPrefix}-pagination-${index}`,
        }).expect(201);
      }

      const firstPage = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .query({
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(firstPage.body.success).toBe(true);
      expect(firstPage.body.data.items).toHaveLength(10);
      expect(firstPage.body.meta.page).toBe(1);
      expect(firstPage.body.meta.limit).toBe(10);
      expect(firstPage.body.meta.total).toBe(25);
      expect(firstPage.body.meta.totalPages).toBe(3);

      const secondPage = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .query({
          page: 2,
          limit: 10,
        })
        .expect(200);

      expect(secondPage.body.success).toBe(true);
      expect(secondPage.body.data.items).toHaveLength(10);
      expect(secondPage.body.meta.page).toBe(2);
      expect(secondPage.body.meta.limit).toBe(10);

      const thirdPage = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .query({
          page: 3,
          limit: 10,
        })
        .expect(200);

      expect(thirdPage.body.success).toBe(true);
      expect(thirdPage.body.data.items).toHaveLength(5);
      expect(thirdPage.body.meta.page).toBe(3);
      expect(thirdPage.body.meta.limit).toBe(10);
    });

    it('should calculate total and totalPages correctly', async () => {
      for (let index = 0; index < 22; index += 1) {
        await createAccount(authorizedUserToken, {
          name: `${testPrefix}-total-${index}`,
        }).expect(201);
      }

      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .query({
          page: 1,
          limit: 10,
        })
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(10);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(10);
      expect(response.body.meta.total).toBe(22);
      expect(response.body.meta.totalPages).toBe(3);
    });

    it('should reject page less than 1', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .query({
          page: 0,
        })
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject limit less than 1', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .query({
          limit: 0,
        })
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject limit greater than 100', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .query({
          limit: 101,
        })
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject a non-numeric page', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .query({
          page: 'abc',
        })
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject a non-numeric limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .query({
          limit: 'abc',
        })
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return an empty page when requesting beyond the available pages', async () => {
      await createAccount(authorizedUserToken).expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .query({ page: 9999, limit: 20 })
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toEqual([]);
      expect(response.body.meta.page).toBe(9999);
      expect(response.body.meta.limit).toBe(20);
      expect(response.body.meta.total).toBe(1);
      expect(response.body.meta.totalPages).toBe(1);
    });
  });

  describe('GET /api/v1/accounts/export', () => {
    const exportRequest = (token: string, format?: string) => {
      const url = format
        ? `/api/v1/accounts/export?format=${format}`
        : '/api/v1/accounts/export';

      return request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${token}`);
    };

    it('should export the authenticated user accounts as a CSV attachment', async () => {
      await createAccount(authorizedUserToken, {
        name: `${testPrefix}-csv-account`,
      }).expect(201);

      const response = await exportRequest(authorizedUserToken, 'csv')
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toMatch(
        /^attachment; filename="navro-accounts-\d{4}-\d{2}-\d{2}\.csv"$/,
      );
      expect(response.headers['cache-control']).toBe('no-store');

      const csv = (response.body as Buffer).toString('utf8');

      expect(csv).toContain(
        'Name,Type,Currency,Opening Balance,Current Balance,Status,Created At,Updated At',
      );
      expect(csv).toContain(`${testPrefix}-csv-account`);
    });

    it('should export the authenticated user accounts as a PDF attachment', async () => {
      await createAccount(authorizedUserToken, {
        name: `${testPrefix}-pdf-account`,
      }).expect(201);

      const response = await exportRequest(authorizedUserToken, 'pdf')
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toMatch(
        /^attachment; filename="navro-accounts-\d{4}-\d{2}-\d{2}\.pdf"$/,
      );

      const pdf = response.body as Buffer;

      expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });

    it('should not include accounts belonging to other users', async () => {
      await createAccount(secondAuthorizedUserToken, {
        name: `${testPrefix}-other-user-account`,
      }).expect(201);

      const response = await exportRequest(authorizedUserToken, 'csv')
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      const csv = (response.body as Buffer).toString('utf8');

      expect(csv).not.toContain(`${testPrefix}-other-user-account`);
    });

    it('should reject export without a format', async () => {
      const response = await exportRequest(authorizedUserToken).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject an unsupported export format', async () => {
      const response = await exportRequest(authorizedUserToken, 'xlsx').expect(
        400,
      );

      expect(response.body.success).toBe(false);
    });

    it('should reject export without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/accounts/export?format=csv')
        .expect(401);
    });

    it('should reject export without accounts:read permission', async () => {
      const response = await exportRequest(unauthorizedUserToken, 'csv').expect(
        403,
      );

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/accounts/:id', () => {
    it('should return an account belonging to the authenticated user', async () => {
      const created = await createAccount(authorizedUserToken).expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/accounts/${created.body.data.id}`)
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta).toEqual({});

      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: created.body.data.id,
          name: created.body.data.name,
          type: created.body.data.type,
          currency: created.body.data.currency,
          openingBalance: created.body.data.openingBalance,
          status: 'ACTIVE',
        }),
      );
    });

    it('should return 404 for a non-existent account', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts/4990c246-06bf-4a81-9c23-62e8265e895f')
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual(
        expect.objectContaining({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        }),
      );
    });
  });

  describe('Ownership isolation', () => {
    it("should not return another authorized user's accounts", async () => {
      const authorizedUserAccount = await createAccount(authorizedUserToken, {
        name: `${testPrefix}-ownership-list`,
      }).expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${secondAuthorizedUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const returnedIds = response.body.data.items.map(
        (account: { id: string }) => account.id,
      );

      expect(returnedIds).not.toContain(authorizedUserAccount.body.data.id);
    });

    it('should not allow another authorized user to access an account by ID', async () => {
      const authorizedUserAccount = await createAccount(authorizedUserToken, {
        name: `${testPrefix}-ownership-id`,
      }).expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/accounts/${authorizedUserAccount.body.data.id}`)
        .set('Authorization', `Bearer ${secondAuthorizedUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);

      expect(response.body.error).toEqual(
        expect.objectContaining({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        }),
      );
    });
  });

  describe('PATCH /api/v1/accounts/:id/archive', () => {
    it('should archive an active account successfully', async () => {
      const created = await createAccount(authorizedUserToken).expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/accounts/${created.body.data.id}/archive`)
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta).toEqual({});

      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: created.body.data.id,
          name: created.body.data.name,
          type: created.body.data.type,
          currency: created.body.data.currency,
          openingBalance: created.body.data.openingBalance,
          status: 'ARCHIVED',
        }),
      );
    });

    it('should persist the archived status', async () => {
      const created = await createAccount(authorizedUserToken).expect(201);
      await request(app.getHttpServer())
        .patch(`/api/v1/accounts/${created.body.data.id}/archive`)
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(200);
      const account = await prisma.account.findUnique({
        where: { id: created.body.data.id },
      });
      expect(account).not.toBeNull();
      expect(account?.status).toBe('ARCHIVED');
    });

    it('should return 409 when archiving an already archived account', async () => {
      const created = await createAccount(authorizedUserToken).expect(201);
      const archiveUrl = `/api/v1/accounts/${created.body.data.id}/archive`;
      await request(app.getHttpServer())
        .patch(archiveUrl)
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(200);
      const response = await request(app.getHttpServer())
        .patch(archiveUrl)
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual(
        expect.objectContaining({
          code: 'ACCOUNT_ALREADY_ARCHIVED',
          message: 'Account is already archived',
        }),
      );
    });

    it('should return 404 when archiving a non-existent account', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/accounts/4990c246-06bf-4a81-9c23-62e8265e895f/archive')
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual(
        expect.objectContaining({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        }),
      );
    });

    it('should not allow another authorized user to archive the account', async () => {
      const created = await createAccount(authorizedUserToken).expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/accounts/${created.body.data.id}/archive`)
        .set('Authorization', `Bearer ${secondAuthorizedUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual(
        expect.objectContaining({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        }),
      );

      const account = await prisma.account.findUnique({
        where: { id: created.body.data.id },
      });

      expect(account?.status).toBe('ACTIVE');
    });

    it('should keep an archived account accessible to its owner', async () => {
      const created = await createAccount(authorizedUserToken).expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/accounts/${created.body.data.id}/archive`)
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/accounts/${created.body.data.id}`)
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: created.body.data.id,
          status: 'ARCHIVED',
        }),
      );
    });

    it('should preserve account data when archiving', async () => {
      const created = await createAccount(authorizedUserToken, {
        name: `${testPrefix}-archive-preserve`,
        type: 'CREDIT_CARD',
        currency: 'MYR',
        openingBalance: '-1250.50',
      }).expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/accounts/${created.body.data.id}/archive`)
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: created.body.data.id,
          name: `${testPrefix}-archive-preserve`,
          type: 'CREDIT_CARD',
          currency: 'MYR',
          openingBalance: '-1250.5',
          status: 'ARCHIVED',
        }),
      );
    });
  });

  describe('GET /api/v1/accounts/:id/balance', () => {
    it('should return the opening balance when the account has no transactions', async () => {
      const created = await createAccount(authorizedUserToken, {
        openingBalance: '1000.50',
      }).expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/accounts/${created.body.data.id}/balance`)
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta).toEqual({});
      expect(response.body.data).toEqual({
        accountId: created.body.data.id,
        currency: 'MYR',
        balance: '1000.5000',
      });
    });

    it('should calculate balance from opening balance, income, and expenses', async () => {
      const created = await createAccount(authorizedUserToken, {
        openingBalance: '1000.0000',
      }).expect(201);

      const accountId = created.body.data.id;

      await createTransaction(accountId, 'INCOME', '500.0000');
      await createTransaction(accountId, 'EXPENSE', '200.0000');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/accounts/${accountId}/balance`)
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        accountId,
        currency: 'MYR',
        balance: '1300.0000',
      });
    });

    it('should reject balance retrieval without authentication', async () => {
      const created = await createAccount(authorizedUserToken).expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/accounts/${created.body.data.id}/balance`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject balance retrieval without accounts:read permission', async () => {
      const created = await createAccount(authorizedUserToken).expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/accounts/${created.body.data.id}/balance`)
        .set('Authorization', `Bearer ${unauthorizedUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when the account does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/accounts/4990c246-06bf-4a81-9c23-62e8265e895f/balance')
        .set('Authorization', `Bearer ${authorizedUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual(
        expect.objectContaining({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        }),
      );
    });

    it('should not expose another authorized user account balance', async () => {
      const created = await createAccount(authorizedUserToken).expect(201);

      await createTransaction(created.body.data.id, 'INCOME', '500.0000');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/accounts/${created.body.data.id}/balance`)
        .set('Authorization', `Bearer ${secondAuthorizedUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual(
        expect.objectContaining({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        }),
      );
    });
  });
});
