import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';

describe('Transactions E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let accessToken: string;
  let secondAccessToken: string;

  let superAdminId: string;
  let accountId: string;

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

    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    jwtService = app.get(JwtService);
    prisma = app.get(PrismaService);

    const superAdmin = await prisma.user.findUnique({
      where: {
        email: 'admin@wealthwise.local',
      },
    });

    if (!superAdmin) {
      throw new Error('Super admin test user not found');
    }

    superAdminId = superAdmin.id;

    accessToken = await jwtService.signAsync({
      sub: superAdmin.id,
      email: superAdmin.email,
    });

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

    const secondUser = await prisma.user.create({
      data: {
        email: `transaction-test-${Date.now()}@wealthwise.local`,
        passwordHash: superAdmin.passwordHash,
        firstName: 'Transaction',
        lastName: 'Test User',
      },
    });

    secondAccessToken = await jwtService.signAsync({
      sub: secondUser.id,
      email: secondUser.email,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/transactions', () => {
    it('should create an expense transaction for an authenticated user', async () => {
      const transactionDate = '2026-09-01T00:00:00.000Z';

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
      expect(persistedTransaction?.transactionDate.toISOString()).toBe(
        transactionDate,
      );
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
          transactionDate: '2026-09-01T00:00:00.000Z',
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
          transactionDate: '2026-09-01T00:00:00.000Z',
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
          transactionDate: '2026-09-01T00:00:00.000Z',
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
          transactionDate: '2026-09-01T00:00:00.000Z',
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
          transactionDate: '2026-09-01T00:00:00.000Z',
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
          transactionDate: '2026-09-01T00:00:00.000Z',
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
          transactionDate: '2026-09-01T00:00:00.000Z',
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
          transactionDate: '2026-09-01T00:00:00.000Z',
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
          transactionDate: '2026-09-01T00:00:00.000Z',
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
          transactionDate: '2026-09-01T00:00:00.000Z',
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
          transactionDate: '2026-09-01T00:00:00.000Z',
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
          transactionDate: '2026-09-01T00:00:00.000Z',
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
          transactionDate: '2026-09-01T00:00:00.000Z',
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
          transactionDate: '2026-09-01T00:00:00.000Z',
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
          transactionDate: '2026-09-02T00:00:00.000Z',
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
          transactionDate: '2026-09-03T00:00:00.000Z',
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
          transactionDate: '2026-09-04T00:00:00.000Z',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBeNull();
    });
  });
});
