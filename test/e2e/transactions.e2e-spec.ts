import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createAccessToken } from './support/access-token';
import request from './support/api-request';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';

// Seeds bypass the service, so FX fields use a labelled MANUAL rate instead of a provider lookup.
const SEED_EXCHANGE_RATE = 20;

const seedFxFields = (amount: string, rateDate: Date) => ({
  baseCurrency: 'INR',
  baseAmount: (Number(amount) * SEED_EXCHANGE_RATE).toFixed(4),
  exchangeRate: SEED_EXCHANGE_RATE.toFixed(8),
  rateDate,
  rateSource: 'MANUAL' as const,
});

describe('Transactions E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let accessToken: string;
  let secondAccessToken: string;
  let secondUserId: string;

  let superAdminId: string;

  // Account used by POST and GET /transactions/:id tests.
  let accountId: string;
  let transactionId: string;

  // Dedicated account used only by GET /transactions list tests.
  let listAccountId: string;
  let listNewestTransactionId: string;
  let listMiddleTransactionId: string;
  let listOldestTransactionId: string;

  let reversalTransactionId: string;

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

    // Stored rates for the dates used below keep MYR conversions off the FX provider, so tests do not depend on network access.
    const storedRateDates = [
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
    ];
    for (const rateDate of storedRateDates.map((date) => new Date(date))) {
      await prisma.exchangeRate.upsert({
        where: {
          fromCurrency_toCurrency_rateDate: {
            fromCurrency: 'MYR',
            toCurrency: 'INR',
            rateDate,
          },
        },
        update: { rate: SEED_EXCHANGE_RATE.toFixed(8) },
        create: {
          fromCurrency: 'MYR',
          toCurrency: 'INR',
          rateDate,
          rate: SEED_EXCHANGE_RATE.toFixed(8),
        },
      });
    }

    const superAdmin = await prisma.user.findUnique({
      where: {
        email: process.env.SEED_ADMIN_EMAIL!,
      },
    });

    if (!superAdmin) {
      throw new Error('Super admin test user not found');
    }

    superAdminId = superAdmin.id;

    accessToken = await createAccessToken(app, {
      userId: superAdmin.id,
      email: superAdmin.email,
    });

    /*
     * Account used by the existing POST and GET /transactions/:id
     * test suites.
     */
    const account = await prisma.account.create({
      data: {
        userId: superAdmin.id,
        name: 'Transaction Test Account',
        type: 'BANK_ACCOUNT',
        currency: 'MYR',
        openingBalance: '1000.0000',
      },
    });

    accountId = account.id;

    const transaction = await prisma.transaction.create({
      data: {
        accountId: account.id,
        type: 'EXPENSE',
        amount: '75.5000',
        currency: 'MYR',
        description: 'Retrieve transaction test',
        transactionDate: new Date('2026-09-05T00:00:00.000Z'),
        ...seedFxFields('75.5000', new Date('2026-09-05T00:00:00.000Z')),
      },
    });

    transactionId = transaction.id;

    /*
     * Dedicated account for GET /api/v1/transactions list tests.
     *
     * This prevents the POST tests from changing the transaction
     * count used by pagination/list assertions.
     */
    const listAccount = await prisma.account.create({
      data: {
        userId: superAdmin.id,
        name: 'Transaction List Test Account',
        type: 'BANK_ACCOUNT',
        currency: 'MYR',
        openingBalance: '1000.0000',
      },
    });

    listAccountId = listAccount.id;

    const newestTransaction = await prisma.transaction.create({
      data: {
        accountId: listAccount.id,
        type: 'INCOME',
        amount: '1500.0000',
        currency: 'MYR',
        description: 'List transaction income',
        transactionDate: new Date('2026-09-10T00:00:00.000Z'),
        ...seedFxFields('1500.0000', new Date('2026-09-10T00:00:00.000Z')),
      },
    });

    listNewestTransactionId = newestTransaction.id;

    const middleTransaction = await prisma.transaction.create({
      data: {
        accountId: listAccount.id,
        type: 'EXPENSE',
        amount: '25.2500',
        currency: 'MYR',
        description: 'List transaction expense',
        transactionDate: new Date('2026-09-08T00:00:00.000Z'),
        ...seedFxFields('25.2500', new Date('2026-09-08T00:00:00.000Z')),
      },
    });

    listMiddleTransactionId = middleTransaction.id;

    const oldestTransaction = await prisma.transaction.create({
      data: {
        accountId: listAccount.id,
        type: 'EXPENSE',
        amount: '75.5000',
        currency: 'MYR',
        description: 'List transaction oldest',
        transactionDate: new Date('2026-09-05T00:00:00.000Z'),
        ...seedFxFields('75.5000', new Date('2026-09-05T00:00:00.000Z')),
      },
    });

    listOldestTransactionId = oldestTransaction.id;

    const secondUser = await prisma.user.create({
      data: {
        email: `transaction-test-${Date.now()}@navro.local`,
        passwordHash: superAdmin.passwordHash,
        firstName: 'Transaction',
        lastName: 'Test User',
        emailVerifiedAt: new Date(),
      },
    });

    const customerRole = await prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });

    if (!customerRole) {
      throw new Error('CUSTOMER role not found. Run npm run db:seed:test');
    }

    /*
     * Another customer with transaction permissions, so the request
     * reaches the ownership check (404) instead of the permission guard (403).
     */
    await prisma.userRole.create({
      data: { userId: secondUser.id, roleId: customerRole.id },
    });

    secondUserId = secondUser.id;

    secondAccessToken = await createAccessToken(app, {
      userId: secondUser.id,
      email: secondUser.email,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/transactions', () => {
    it('should create an expense transaction for an authenticated user', async () => {
      const transactionDate = '2026-09-01';

      const response = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '50.0000',
          currency: 'MYR',
          description: 'Lunch',
          transactionDate,
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          accountId,
          type: 'EXPENSE',
          amount: '50.0000',
          currency: 'MYR',
          description: 'Lunch',
          transactionDate,
          id: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );

      const persistedTransaction = await prisma.transaction.findUnique({
        where: {
          id: response.body.data.id,
        },
      });

      expect(persistedTransaction).not.toBeNull();

      expect(persistedTransaction?.accountId).toBe(accountId);
      expect(persistedTransaction?.type).toBe('EXPENSE');
      expect(persistedTransaction?.amount.toString()).toBe('50');
      expect(persistedTransaction?.currency.trim()).toBe('MYR');
      expect(persistedTransaction?.description).toBe('Lunch');
      expect(
        persistedTransaction?.transactionDate.toISOString().slice(0, 10),
      ).toBe(transactionDate);
    });

    it('should reject creating a transaction without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '50.0000',
          currency: 'MYR',
          description: 'Unauthorized transaction',
          transactionDate: '2026-09-01',
        })
        .expect(401);
    });

    it('should reject creating a transaction for another user account', async () => {
      const description = 'Unauthorized transaction';

      const response = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '25.0000',
          currency: 'MYR',
          description,
          transactionDate: '2026-09-01',
        })
        .expect(404);

      expect(response.body.success).toBe(false);

      const persistedUnauthorizedTransaction =
        await prisma.transaction.findFirst({
          where: {
            accountId,
            description,
          },
        });

      expect(persistedUnauthorizedTransaction).toBeNull();
    });

    it('should reject an invalid transaction amount', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: 'invalid',
          currency: 'MYR',
          description: 'Invalid amount',
          transactionDate: '2026-09-01',
        })
        .expect(400);
    });

    it('should reject a zero transaction amount', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '0',
          currency: 'MYR',
          description: 'Zero amount',
          transactionDate: '2026-09-01',
        })
        .expect(400);
    });

    it('should reject a negative transaction amount', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '-10.00',
          currency: 'MYR',
          description: 'Negative amount',
          transactionDate: '2026-09-01',
        })
        .expect(400);
    });

    it('should reject an amount with more than 4 decimal places', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '10.12345',
          currency: 'MYR',
          description: 'Too many decimals',
          transactionDate: '2026-09-01',
        })
        .expect(400);
    });

    it('should reject an amount with more than 15 integer digits', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '1234567890123456.00',
          currency: 'MYR',
          description: 'Too many integer digits',
          transactionDate: '2026-09-01',
        })
        .expect(400);
    });

    it('should reject an invalid transaction type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'TRANSFER',
          amount: '50.00',
          currency: 'MYR',
          description: 'Invalid transaction type',
          transactionDate: '2026-09-01',
        })
        .expect(400);
    });

    it('should reject an invalid currency format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '50.00',
          currency: 'MY',
          description: 'Invalid currency',
          transactionDate: '2026-09-01',
        })
        .expect(400);
    });

    it('should reject a currency containing non-letter characters', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '50.00',
          currency: 'M1R',
          description: 'Invalid currency',
          transactionDate: '2026-09-01',
        })
        .expect(400);
    });

    it('should reject a currency different from the account currency', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '50.00',
          currency: 'USD',
          description: 'Currency mismatch',
          transactionDate: '2026-09-01',
        })
        .expect(400);

      const persistedTransaction = await prisma.transaction.findFirst({
        where: {
          accountId,
          description: 'Currency mismatch',
        },
      });

      expect(persistedTransaction).toBeNull();
    });

    it('should reject creating a transaction for an archived account', async () => {
      const archivedAccount = await prisma.account.create({
        data: {
          userId: superAdminId,
          name: 'Archived Transaction Test Account',
          type: 'BANK_ACCOUNT',
          currency: 'MYR',
          openingBalance: '1000.0000',
          status: 'ARCHIVED',
        },
      });

      const description = 'Archived account transaction';

      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: archivedAccount.id,
          type: 'EXPENSE',
          amount: '50.00',
          currency: 'MYR',
          description,
          transactionDate: '2026-09-01',
        })
        .expect(400);

      const persistedTransaction = await prisma.transaction.findFirst({
        where: {
          accountId: archivedAccount.id,
          description,
        },
      });

      expect(persistedTransaction).toBeNull();
    });

    it('should reject an invalid transaction date', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '50.00',
          currency: 'MYR',
          description: 'Invalid date',
          transactionDate: 'not-a-date',
        })
        .expect(400);
    });

    it('should reject a description longer than 255 characters', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '50.00',
          currency: 'MYR',
          description: 'a'.repeat(256),
          transactionDate: '2026-09-01',
        })
        .expect(400);
    });

    it('should reject unexpected fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '50.00',
          currency: 'MYR',
          description: 'Unexpected field',
          transactionDate: '2026-09-01',
          userId: superAdminId,
        })
        .expect(400);
    });

    it('should accept a transaction amount with exactly 15 integer digits', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'INCOME',
          amount: '123456789012345.1234',
          currency: 'MYR',
          description: 'Maximum supported amount format',
          transactionDate: '2026-09-02',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe('123456789012345.1234');

      const persistedTransaction = await prisma.transaction.findUnique({
        where: {
          id: response.body.data.id,
        },
      });

      expect(persistedTransaction).not.toBeNull();

      expect(persistedTransaction?.amount.toString()).toBe(
        '123456789012345.1234',
      );
    });

    it('should normalize lowercase currency to uppercase', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '15.50',
          currency: 'myr',
          description: 'Lowercase currency',
          transactionDate: '2026-09-03',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currency).toBe('MYR');

      const persistedTransaction = await prisma.transaction.findUnique({
        where: {
          id: response.body.data.id,
        },
      });

      expect(persistedTransaction).not.toBeNull();
      expect(persistedTransaction?.currency.trim()).toBe('MYR');
    });

    it('should allow a null description', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '20.00',
          currency: 'MYR',
          description: null,
          transactionDate: '2026-09-04',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBeNull();
    });
  });

  describe('GET /api/v1/transactions/:id', () => {
    it('should retrieve a transaction for the authenticated owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: transactionId,
          accountId,
          type: 'EXPENSE',
          amount: '75.5000',
          currency: 'MYR',
          description: 'Retrieve transaction test',
          transactionDate: '2026-09-05',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
    });

    it('should reject retrieving a transaction without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/transactions/${transactionId}`)
        .expect(401);
    });

    it('should return 404 when the transaction does not exist', async () => {
      const nonExistentTransactionId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get(`/api/v1/transactions/${nonExistentTransactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when another user tries to retrieve the transaction', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return the persisted transaction data', async () => {
      const persistedTransaction = await prisma.transaction.findUnique({
        where: {
          id: transactionId,
        },
      });

      expect(persistedTransaction).not.toBeNull();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: persistedTransaction?.id,
          accountId: persistedTransaction?.accountId,
          type: persistedTransaction?.type,
          amount: persistedTransaction?.amount.toFixed(4),
          currency: persistedTransaction?.currency.trim(),
          description: persistedTransaction?.description,
          transactionDate: persistedTransaction?.transactionDate
            .toISOString()
            .slice(0, 10),
          createdAt: persistedTransaction?.createdAt.toISOString(),
          updatedAt: persistedTransaction?.updatedAt.toISOString(),
        }),
      );
    });
  });

  describe('GET /api/v1/transactions', () => {
    it('should retrieve paginated transactions for the authenticated owner', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({
          accountId: listAccountId,
          page: 1,
          limit: 20,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      expect(response.body.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: listNewestTransactionId,
            accountId: listAccountId,
            type: 'INCOME',
            amount: '1500.0000',
            currency: 'MYR',
            description: 'List transaction income',
            transactionDate: '2026-09-10',
          }),
          expect.objectContaining({
            id: listMiddleTransactionId,
            accountId: listAccountId,
            type: 'EXPENSE',
            amount: '25.2500',
            currency: 'MYR',
            description: 'List transaction expense',
            transactionDate: '2026-09-08',
          }),
          expect.objectContaining({
            id: listOldestTransactionId,
            accountId: listAccountId,
            type: 'EXPENSE',
            amount: '75.5000',
            currency: 'MYR',
            description: 'List transaction oldest',
            transactionDate: '2026-09-05',
          }),
        ]),
      );

      expect(response.body.meta).toEqual({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should reject retrieving transactions without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({
          accountId: listAccountId,
          page: 1,
          limit: 20,
        })
        .expect(401);
    });

    it('should return 404 when another user tries to list transactions for the account', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({
          accountId: listAccountId,
          page: 1,
          limit: 20,
        })
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when the account does not exist', async () => {
      const nonExistentAccountId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({
          accountId: nonExistentAccountId,
          page: 1,
          limit: 20,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should use the default page and limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({
          accountId: listAccountId,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      expect(response.body.meta).toEqual({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      expect(response.body.data.items).toHaveLength(3);
    });

    it('should return transactions in transaction date descending order', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({
          accountId: listAccountId,
          page: 1,
          limit: 20,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(
        response.body.data.items.map(
          (transaction: { id: string }) => transaction.id,
        ),
      ).toEqual([
        listNewestTransactionId,
        listMiddleTransactionId,
        listOldestTransactionId,
      ]);
    });

    it('should reject page zero', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({
          accountId: listAccountId,
          page: 0,
          limit: 20,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should reject a negative page', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({
          accountId: listAccountId,
          page: -1,
          limit: 20,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should reject a zero limit', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({
          accountId: listAccountId,
          page: 1,
          limit: 0,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should reject a limit greater than 100', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({
          accountId: listAccountId,
          page: 1,
          limit: 101,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should reject an invalid account id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({
          accountId: 'invalid-account-id',
          page: 1,
          limit: 20,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should reject unexpected query parameters', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({
          accountId: listAccountId,
          page: 1,
          limit: 20,
          unexpected: 'value',
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should paginate transactions using page and limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({
          accountId: listAccountId,
          page: 1,
          limit: 2,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2);

      expect(
        response.body.data.items.map(
          (transaction: { id: string }) => transaction.id,
        ),
      ).toEqual([listNewestTransactionId, listMiddleTransactionId]);

      expect(response.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('should retrieve the second page of transactions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query({
          accountId: listAccountId,
          page: 2,
          limit: 2,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);

      expect(response.body.data.items[0]).toEqual(
        expect.objectContaining({
          id: listOldestTransactionId,
          accountId: listAccountId,
          amount: '75.5000',
          currency: 'MYR',
          description: 'List transaction oldest',
        }),
      );

      expect(response.body.meta).toEqual({
        page: 2,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });
  });

  describe('GET /api/v1/transactions filters', () => {
    const windowFrom = '2031-03-01';
    const windowTo = '2031-03-31';

    let filterAccountAId: string;
    let secondUserAccountId: string;
    let systemIncomeCategoryId: string;
    let systemExpenseCategoryId: string;
    let filterIncomeTransactionId: string;
    let filterCategorizedExpenseId: string;
    let filterUncategorizedExpenseId: string;
    let secondUserTransactionId: string;

    const createFilterTransaction = (data: {
      accountId: string;
      type: 'INCOME' | 'EXPENSE';
      amount: string;
      transactionDate: string;
      description: string;
      incomeCategoryId?: string;
      expenseCategoryId?: string;
    }) => {
      const rateDate = new Date(`${data.transactionDate}T00:00:00.000Z`);

      return prisma.transaction.create({
        data: {
          accountId: data.accountId,
          type: data.type,
          amount: data.amount,
          currency: 'MYR',
          description: data.description,
          transactionDate: rateDate,
          incomeCategoryId: data.incomeCategoryId,
          expenseCategoryId: data.expenseCategoryId,
          ...seedFxFields(data.amount, rateDate),
        },
      });
    };

    const listTransactions = (
      token: string,
      query: Record<string, string | number>,
    ) =>
      request(app.getHttpServer())
        .get('/api/v1/transactions')
        .query(query)
        .set('Authorization', `Bearer ${token}`);

    const itemIds = (body: { data: { items: { id: string }[] } }) =>
      body.data.items.map((item) => item.id);

    beforeAll(async () => {
      const systemIncomeCategory = await prisma.incomeCategory.findFirst({
        where: { userId: null },
      });
      const systemExpenseCategory = await prisma.expenseCategory.findFirst({
        where: { userId: null },
      });

      if (!systemIncomeCategory || !systemExpenseCategory) {
        throw new Error(
          'System categories not found. Run npm run db:seed:test',
        );
      }

      systemIncomeCategoryId = systemIncomeCategory.id;
      systemExpenseCategoryId = systemExpenseCategory.id;

      const accountA = await prisma.account.create({
        data: {
          userId: superAdminId,
          name: 'Transaction Filter Account A',
          type: 'BANK_ACCOUNT',
          currency: 'MYR',
          openingBalance: '0.0000',
        },
      });
      const accountB = await prisma.account.create({
        data: {
          userId: superAdminId,
          name: 'Transaction Filter Account B',
          type: 'BANK_ACCOUNT',
          currency: 'MYR',
          openingBalance: '0.0000',
        },
      });
      const secondAccount = await prisma.account.create({
        data: {
          userId: secondUserId,
          name: 'Transaction Filter Second User Account',
          type: 'BANK_ACCOUNT',
          currency: 'MYR',
          openingBalance: '0.0000',
        },
      });

      filterAccountAId = accountA.id;
      secondUserAccountId = secondAccount.id;

      const incomeTransaction = await createFilterTransaction({
        accountId: accountA.id,
        type: 'INCOME',
        amount: '1000.0000',
        transactionDate: '2031-03-05',
        description: 'Filter income',
        incomeCategoryId: systemIncomeCategoryId,
      });
      const categorizedExpense = await createFilterTransaction({
        accountId: accountA.id,
        type: 'EXPENSE',
        amount: '200.0000',
        transactionDate: '2031-03-10',
        description: 'Filter categorized expense',
        expenseCategoryId: systemExpenseCategoryId,
      });
      const uncategorizedExpense = await createFilterTransaction({
        accountId: accountB.id,
        type: 'EXPENSE',
        amount: '50.0000',
        transactionDate: '2031-03-20',
        description: 'Filter uncategorized expense',
      });
      const secondUserTransaction = await createFilterTransaction({
        accountId: secondAccount.id,
        type: 'EXPENSE',
        amount: '999.0000',
        transactionDate: '2031-03-10',
        description: 'Filter second user expense',
      });

      filterIncomeTransactionId = incomeTransaction.id;
      filterCategorizedExpenseId = categorizedExpense.id;
      filterUncategorizedExpenseId = uncategorizedExpense.id;
      secondUserTransactionId = secondUserTransaction.id;
    });

    it('should list transactions across all accounts when accountId is omitted', async () => {
      const response = await listTransactions(accessToken, {
        from: windowFrom,
        to: windowTo,
        page: 1,
        limit: 20,
      }).expect(200);

      expect(response.body.success).toBe(true);
      expect(itemIds(response.body)).toHaveLength(3);
      expect(itemIds(response.body)).toEqual(
        expect.arrayContaining([
          filterIncomeTransactionId,
          filterCategorizedExpenseId,
          filterUncategorizedExpenseId,
        ]),
      );
      expect(response.body.meta.total).toBe(3);
    });

    it('should include transactions on both ends of the date range', async () => {
      const response = await listTransactions(accessToken, {
        from: '2031-03-10',
        to: '2031-03-20',
        page: 1,
        limit: 20,
      }).expect(200);

      expect(itemIds(response.body)).toHaveLength(2);
      expect(itemIds(response.body)).toEqual(
        expect.arrayContaining([
          filterCategorizedExpenseId,
          filterUncategorizedExpenseId,
        ]),
      );
    });

    it('should return only transactions on a single day when from equals to', async () => {
      const response = await listTransactions(accessToken, {
        from: '2031-03-10',
        to: '2031-03-10',
        page: 1,
        limit: 20,
      }).expect(200);

      expect(itemIds(response.body)).toEqual([filterCategorizedExpenseId]);
    });

    it('should filter transactions by type', async () => {
      const expenseResponse = await listTransactions(accessToken, {
        from: windowFrom,
        to: windowTo,
        type: 'EXPENSE',
        page: 1,
        limit: 20,
      }).expect(200);

      expect(itemIds(expenseResponse.body)).toHaveLength(2);
      expect(itemIds(expenseResponse.body)).toEqual(
        expect.arrayContaining([
          filterCategorizedExpenseId,
          filterUncategorizedExpenseId,
        ]),
      );

      const incomeResponse = await listTransactions(accessToken, {
        from: windowFrom,
        to: windowTo,
        type: 'INCOME',
        page: 1,
        limit: 20,
      }).expect(200);

      expect(itemIds(incomeResponse.body)).toEqual([filterIncomeTransactionId]);
    });

    it('should filter transactions by expense category', async () => {
      const response = await listTransactions(accessToken, {
        from: windowFrom,
        to: windowTo,
        expenseCategoryId: systemExpenseCategoryId,
        page: 1,
        limit: 20,
      }).expect(200);

      expect(itemIds(response.body)).toEqual([filterCategorizedExpenseId]);
    });

    it('should filter transactions by income category', async () => {
      const response = await listTransactions(accessToken, {
        from: windowFrom,
        to: windowTo,
        incomeCategoryId: systemIncomeCategoryId,
        page: 1,
        limit: 20,
      }).expect(200);

      expect(itemIds(response.body)).toEqual([filterIncomeTransactionId]);
    });

    it('should combine accountId with the other filters', async () => {
      const response = await listTransactions(accessToken, {
        accountId: filterAccountAId,
        from: windowFrom,
        to: windowTo,
        type: 'EXPENSE',
        page: 1,
        limit: 20,
      }).expect(200);

      expect(itemIds(response.body)).toEqual([filterCategorizedExpenseId]);
      expect(response.body.meta.total).toBe(1);
    });

    it('should return 400 when from is after to', async () => {
      const response = await listTransactions(accessToken, {
        from: '2031-03-20',
        to: '2031-03-01',
        page: 1,
        limit: 20,
      }).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'INVALID_TRANSACTION' }),
      );
    });

    it('should reject a malformed from date', async () => {
      await listTransactions(accessToken, {
        from: '03/10/2031',
        page: 1,
        limit: 20,
      }).expect(400);
    });

    it('should reject an unknown transaction type', async () => {
      await listTransactions(accessToken, {
        type: 'TRANSFER',
        page: 1,
        limit: 20,
      }).expect(400);
    });

    it('should reject a category id that is not a UUID', async () => {
      await listTransactions(accessToken, {
        expenseCategoryId: 'not-a-uuid',
        page: 1,
        limit: 20,
      }).expect(400);
    });

    it('should return only the authenticated user transactions', async () => {
      const response = await listTransactions(secondAccessToken, {
        from: windowFrom,
        to: windowTo,
        page: 1,
        limit: 20,
      }).expect(200);

      expect(itemIds(response.body)).toEqual([secondUserTransactionId]);
      expect(response.body.meta.total).toBe(1);
    });

    it('should return 404 when filtering by another user account', async () => {
      const response = await listTransactions(accessToken, {
        accountId: secondUserAccountId,
        from: windowFrom,
        to: windowTo,
        page: 1,
        limit: 20,
      }).expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/transactions/:id/reversal', () => {
    it('should create a reversal transaction for the authenticated owner', async () => {
      const transactionDate = '2026-09-11';

      const response = await request(app.getHttpServer())
        .post(`/api/v1/transactions/${transactionId}/reversal`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transactionDate,
          description: 'Reversal of retrieve transaction test',
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          accountId,
          type: 'INCOME',
          amount: '75.5000',
          currency: 'MYR',
          description: 'Reversal of retrieve transaction test',
          transactionDate,
          reversalOfTransactionId: transactionId,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );

      reversalTransactionId = response.body.data.id;

      const persistedReversal = await prisma.transaction.findUnique({
        where: {
          id: reversalTransactionId,
        },
      });

      expect(persistedReversal).not.toBeNull();
      expect(persistedReversal?.accountId).toBe(accountId);
      expect(persistedReversal?.type).toBe('INCOME');
      expect(persistedReversal?.amount.toString()).toBe('75.5');
      expect(persistedReversal?.currency.trim()).toBe('MYR');
      expect(persistedReversal?.description).toBe(
        'Reversal of retrieve transaction test',
      );
      expect(persistedReversal?.reversalOfTransactionId).toBe(transactionId);
    });

    it('should reject creating a reversal without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/transactions/${transactionId}/reversal`)
        .send({
          transactionDate: '2026-09-12',
          description: 'Unauthorized reversal',
        })
        .expect(401);
    });

    it('should reverse an expense into an income transaction', async () => {
      const sourceTransaction = await prisma.transaction.create({
        data: {
          accountId,
          type: 'EXPENSE',
          amount: '125.2500',
          currency: 'MYR',
          description: 'Expense reversal source',
          transactionDate: new Date('2026-09-13T00:00:00.000Z'),
          ...seedFxFields('125.2500', new Date('2026-09-13T00:00:00.000Z')),
        },
      });

      const transactionDate = '2026-09-14';

      const response = await request(app.getHttpServer())
        .post(`/api/v1/transactions/${sourceTransaction.id}/reversal`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transactionDate,
          description: 'Expense reversal',
        })
        .expect(201);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          type: 'INCOME',
          amount: '125.2500',
          currency: 'MYR',
          description: 'Expense reversal',
          transactionDate,
          reversalOfTransactionId: sourceTransaction.id,
        }),
      );
    });

    it('should reject reversing the same transaction twice', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/transactions/${transactionId}/reversal`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transactionDate: '2026-09-15',
          description: 'Duplicate reversal',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject reversing a reversal transaction', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/transactions/${reversalTransactionId}/reversal`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transactionDate: '2026-09-16',
          description: 'Reversal of reversal',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when the transaction does not exist', async () => {
      const nonExistentTransactionId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .post(`/api/v1/transactions/${nonExistentTransactionId}/reversal`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transactionDate: '2026-09-17',
          description: 'Missing transaction reversal',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when another user tries to reverse the transaction', async () => {
      const sourceTransaction = await prisma.transaction.create({
        data: {
          accountId,
          type: 'EXPENSE',
          amount: '90.0000',
          currency: 'MYR',
          description: 'Cross-user reversal source',
          transactionDate: new Date('2026-09-23T00:00:00.000Z'),
          ...seedFxFields('90.0000', new Date('2026-09-23T00:00:00.000Z')),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/transactions/${sourceTransaction.id}/reversal`)
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .send({
          transactionDate: '2026-09-24',
          description: 'Unauthorized reversal',
        })
        .expect(404);

      expect(response.body.success).toBe(false);

      const unauthorizedReversal = await prisma.transaction.findFirst({
        where: {
          reversalOfTransactionId: sourceTransaction.id,
        },
      });

      expect(unauthorizedReversal).toBeNull();
    });

    it('should reject an invalid reversal date', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/transactions/${transactionId}/reversal`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transactionDate: 'not-a-date',
          description: 'Invalid reversal date',
        })
        .expect(400);
    });

    it('should reject a reversal description longer than 255 characters', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/transactions/${transactionId}/reversal`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transactionDate: '2026-09-19',
          description: 'a'.repeat(256),
        })
        .expect(400);
    });

    it('should reject unexpected fields in the reversal request', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/transactions/${transactionId}/reversal`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transactionDate: '2026-09-20',
          description: 'Unexpected reversal field',
          accountId,
          type: 'INCOME',
          amount: '75.5000',
          currency: 'MYR',
        })
        .expect(400);
    });

    it('should allow a null reversal description', async () => {
      const sourceTransaction = await prisma.transaction.create({
        data: {
          accountId,
          type: 'INCOME',
          amount: '300.0000',
          currency: 'MYR',
          description: 'Income reversal source',
          transactionDate: new Date('2026-09-21T00:00:00.000Z'),
          ...seedFxFields('300.0000', new Date('2026-09-21T00:00:00.000Z')),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/transactions/${sourceTransaction.id}/reversal`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transactionDate: '2026-09-22',
          description: null,
        })
        .expect(201);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          type: 'EXPENSE',
          amount: '300.0000',
          currency: 'MYR',
          description: null,
          reversalOfTransactionId: sourceTransaction.id,
        }),
      );
    });
  });
});
