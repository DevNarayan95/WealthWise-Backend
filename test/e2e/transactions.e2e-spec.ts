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
import { AccountType } from '../../prisma/generated/prisma/client';

describe('Transactions (E2E)', () => {
  let app: INestApplication;
  let accessToken: string;
  let prisma: PrismaService;
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

    const jwtService = app.get(JwtService);
    prisma = app.get(PrismaService);

    const superAdmin = await prisma.user.findUnique({
      where: {
        email: 'admin@wealthwise.local',
      },
    });

    if (!superAdmin) {
      throw new Error('Super Admin user not found. Run npm run db:seed');
    }

    superAdminId = superAdmin.id;

    accessToken = await jwtService.signAsync({
      sub: superAdmin.id,
      email: superAdmin.email,
    });

    const account = await prisma.account.create({
      data: {
        userId: superAdmin.id,
        name: `Transaction E2E Account ${Date.now()}`,
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '1000.00',
      },
    });

    accountId = account.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/transactions', () => {
    it('should create an expense transaction for the authenticated user', async () => {
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
        });

      console.log('TRANSACTION RESPONSE:', {
        status: response.status,
        body: response.body,
        text: response.text,
      });

      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);
      expect(response.body.meta).toEqual({});

      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          accountId,
          type: 'EXPENSE',
          amount: '50.0000',
          currency: 'MYR',
          description: 'Lunch',
          transactionDate,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );

      expect(response.body.data.userId).toBeUndefined();

      const persistedTransaction = await prisma.transaction.findUnique({
        where: {
          id: response.body.data.id,
        },
      });

      expect(persistedTransaction).not.toBeNull();
      expect(persistedTransaction).toEqual(
        expect.objectContaining({
          accountId,
          type: 'EXPENSE',
          amount: expect.objectContaining({
            toString: expect.any(Function),
          }),
          currency: 'MYR',
          description: 'Lunch',
        }),
      );

      expect(persistedTransaction?.amount.toString()).toBe('50');
      expect(persistedTransaction?.transactionDate.toISOString()).toBe(
        transactionDate,
      );
    });

    it('should reject the request when authentication is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '50.0000',
          currency: 'MYR',
          description: 'Lunch',
          transactionDate: '2026-09-01T00:00:00.000Z',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject an invalid amount', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '-50.0000',
          currency: 'MYR',
          description: 'Invalid amount',
          transactionDate: '2026-09-01T00:00:00.000Z',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject an invalid currency', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '50.0000',
          currency: 'M',
          description: 'Invalid currency',
          transactionDate: '2026-09-01T00:00:00.000Z',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject unexpected fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: '50.0000',
          currency: 'MYR',
          description: 'Lunch',
          transactionDate: '2026-09-01T00:00:00.000Z',
          userId: superAdminId,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
