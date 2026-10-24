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

const SEED_EXCHANGE_RATE = 20;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

describe('Transfers E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let accessToken: string;
  let secondAccessToken: string;

  let sourceAccountId: string;
  let destinationAccountId: string;
  let sameCurrencyAccountId: string;
  let archivedAccountId: string;
  let otherUserAccountId: string;

  let crossTransferOutLegId: string;
  let crossTransferInLegId: string;
  let crossTransferGroupId: string;

  let sameCurrencyOutLegId: string;
  let sameCurrencyInLegId: string;

  const fetchBalance = async (
    token: string,
    accountId: string,
  ): Promise<string> => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/accounts/${accountId}/balance`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const balance: string = response.body.data.balance;

    return balance;
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

    // Stored rates keep MYR to INR conversions off the FX provider.
    for (const date of ['2026-09-01', '2026-09-02', '2026-09-03']) {
      const rateDate = new Date(date);

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
      where: { email: process.env.SEED_ADMIN_EMAIL! },
    });

    if (!superAdmin) {
      throw new Error('Super admin test user not found');
    }

    accessToken = await createAccessToken(app, {
      userId: superAdmin.id,
      email: superAdmin.email,
    });

    const sourceAccount = await prisma.account.create({
      data: {
        userId: superAdmin.id,
        name: 'Transfer Source MYR',
        type: 'BANK_ACCOUNT',
        currency: 'MYR',
        openingBalance: '1000.0000',
      },
    });
    sourceAccountId = sourceAccount.id;

    const destinationAccount = await prisma.account.create({
      data: {
        userId: superAdmin.id,
        name: 'Transfer Destination INR',
        type: 'BANK_ACCOUNT',
        currency: 'INR',
        openingBalance: '0.0000',
      },
    });
    destinationAccountId = destinationAccount.id;

    const sameCurrencyAccount = await prisma.account.create({
      data: {
        userId: superAdmin.id,
        name: 'Transfer Same Currency MYR',
        type: 'BANK_ACCOUNT',
        currency: 'MYR',
        openingBalance: '0.0000',
      },
    });
    sameCurrencyAccountId = sameCurrencyAccount.id;

    const archivedAccount = await prisma.account.create({
      data: {
        userId: superAdmin.id,
        name: 'Transfer Archived MYR',
        type: 'BANK_ACCOUNT',
        currency: 'MYR',
        openingBalance: '0.0000',
        status: 'ARCHIVED',
      },
    });
    archivedAccountId = archivedAccount.id;

    const secondUser = await prisma.user.create({
      data: {
        email: `transfer-test-${Date.now()}@navro.local`,
        passwordHash: superAdmin.passwordHash,
        firstName: 'Transfer',
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

    // Gives the second user transaction permissions so requests reach the ownership check.
    await prisma.userRole.create({
      data: { userId: secondUser.id, roleId: customerRole.id },
    });

    secondAccessToken = await createAccessToken(app, {
      userId: secondUser.id,
      email: secondUser.email,
    });

    const otherUserAccount = await prisma.account.create({
      data: {
        userId: secondUser.id,
        name: 'Other User MYR',
        type: 'BANK_ACCOUNT',
        currency: 'MYR',
        openingBalance: '500.0000',
      },
    });
    otherUserAccountId = otherUserAccount.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/transfers', () => {
    it('creates a cross-currency transfer with the converted destination amount', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceAccountId,
          destinationAccountId,
          amount: '50.00',
          transactionDate: '2026-09-01',
          description: 'Savings top-up',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transferGroupId).toMatch(UUID_PATTERN);

      const { outLeg, inLeg } = response.body.data;

      expect(outLeg).toEqual(
        expect.objectContaining({
          accountId: sourceAccountId,
          type: 'TRANSFER_OUT',
          amount: '50.0000',
          currency: 'MYR',
          transferGroupId: response.body.data.transferGroupId,
          transferExchangeRate: '20.00000000',
          description: 'Savings top-up',
          transactionDate: '2026-09-01',
        }),
      );
      expect(outLeg.transferRateSource).not.toBeNull();

      expect(inLeg).toEqual(
        expect.objectContaining({
          accountId: destinationAccountId,
          type: 'TRANSFER_IN',
          amount: '1000.0000',
          currency: 'INR',
          transferGroupId: response.body.data.transferGroupId,
          transferExchangeRate: '20.00000000',
        }),
      );

      crossTransferGroupId = response.body.data.transferGroupId;
      crossTransferOutLegId = outLeg.id;
      crossTransferInLegId = inLeg.id;

      expect(await fetchBalance(accessToken, sourceAccountId)).toBe('950.0000');
      expect(await fetchBalance(accessToken, destinationAccountId)).toBe(
        '1000.0000',
      );
    });

    it('creates a same-currency transfer with an identity rate', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceAccountId,
          destinationAccountId: sameCurrencyAccountId,
          amount: '30.00',
          transactionDate: '2026-09-02',
        })
        .expect(201);

      const { outLeg, inLeg } = response.body.data;

      expect(inLeg).toEqual(
        expect.objectContaining({
          accountId: sameCurrencyAccountId,
          type: 'TRANSFER_IN',
          amount: '30.0000',
          currency: 'MYR',
          transferExchangeRate: '1.00000000',
          transferRateSource: 'IDENTITY',
        }),
      );
      expect(outLeg.description).toBeNull();

      sameCurrencyOutLegId = outLeg.id;
      sameCurrencyInLegId = inLeg.id;

      expect(await fetchBalance(accessToken, sourceAccountId)).toBe('920.0000');
      expect(await fetchBalance(accessToken, sameCurrencyAccountId)).toBe(
        '30.0000',
      );
    });

    it('rejects a transfer from an account to itself', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceAccountId,
          destinationAccountId: sourceAccountId,
          amount: '10.00',
          transactionDate: '2026-09-02',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'INVALID_TRANSACTION' }),
      );
    });

    it('rejects a transfer into an archived account', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceAccountId,
          destinationAccountId: archivedAccountId,
          amount: '10.00',
          transactionDate: '2026-09-02',
        })
        .expect(400);

      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'INVALID_TRANSACTION' }),
      );
    });

    it('rejects a destination account owned by another user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceAccountId,
          destinationAccountId: otherUserAccountId,
          amount: '10.00',
          transactionDate: '2026-09-02',
        })
        .expect(404);
    });

    it('rejects a non-positive amount', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceAccountId,
          destinationAccountId,
          amount: '0',
          transactionDate: '2026-09-02',
        })
        .expect(400);
    });

    it('rejects a transfer type in the payload', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceAccountId,
          destinationAccountId,
          amount: '10.00',
          transactionDate: '2026-09-02',
          type: 'TRANSFER_OUT',
        })
        .expect(400);
    });

    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transfers')
        .send({
          sourceAccountId,
          destinationAccountId,
          amount: '10.00',
          transactionDate: '2026-09-02',
        })
        .expect(401);
    });
  });

  describe('POST /api/v1/transfers/:transactionId/reversal', () => {
    it('reverses both legs when reversing from the destination leg', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/transfers/${crossTransferInLegId}/reversal`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transactionDate: '2026-09-03',
          description: 'Undo transfer',
        })
        .expect(201);

      const { transferGroupId, outLeg, inLeg } = response.body.data;

      expect(transferGroupId).toMatch(UUID_PATTERN);
      expect(transferGroupId).not.toBe(crossTransferGroupId);

      expect(outLeg).toEqual(
        expect.objectContaining({
          accountId: destinationAccountId,
          type: 'TRANSFER_OUT',
          amount: '1000.0000',
          currency: 'INR',
          reversalOfTransactionId: crossTransferInLegId,
        }),
      );
      expect(inLeg).toEqual(
        expect.objectContaining({
          accountId: sourceAccountId,
          type: 'TRANSFER_IN',
          amount: '50.0000',
          currency: 'MYR',
          reversalOfTransactionId: crossTransferOutLegId,
        }),
      );

      expect(await fetchBalance(accessToken, sourceAccountId)).toBe('970.0000');
      expect(await fetchBalance(accessToken, destinationAccountId)).toBe(
        '0.0000',
      );
    });

    it('reverses a same-currency transfer from the source leg', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/transfers/${sameCurrencyOutLegId}/reversal`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transactionDate: '2026-09-03' })
        .expect(201);

      expect(await fetchBalance(accessToken, sourceAccountId)).toBe(
        '1000.0000',
      );
      expect(await fetchBalance(accessToken, sameCurrencyAccountId)).toBe(
        '0.0000',
      );
    });

    it('rejects reversing a transfer that was already reversed', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/transfers/${crossTransferOutLegId}/reversal`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transactionDate: '2026-09-03' })
        .expect(400);

      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'INVALID_TRANSACTION' }),
      );
      expect(await fetchBalance(accessToken, sourceAccountId)).toBe(
        '1000.0000',
      );
    });

    it('rejects reversing a transfer leg owned by another user', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/transfers/${sameCurrencyInLegId}/reversal`)
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .send({ transactionDate: '2026-09-03' })
        .expect(404);
    });

    it('returns 404 for an unknown transaction id', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/transfers/${UNKNOWN_UUID}/reversal`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transactionDate: '2026-09-03' })
        .expect(404);
    });

    it('keeps the generic reversal endpoint from reversing a transfer leg', async () => {
      const pairResponse = await request(app.getHttpServer())
        .post('/api/v1/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sourceAccountId,
          destinationAccountId: sameCurrencyAccountId,
          amount: '5.00',
          transactionDate: '2026-09-02',
        })
        .expect(201);

      const legId = pairResponse.body.data.inLeg.id;
      const balanceBefore = await fetchBalance(
        accessToken,
        sameCurrencyAccountId,
      );

      const response = await request(app.getHttpServer())
        .post(`/api/v1/transactions/${legId}/reversal`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transactionDate: '2026-09-03' })
        .expect(400);

      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'TRANSACTION_CANNOT_BE_REVERSED' }),
      );
      expect(await fetchBalance(accessToken, sameCurrencyAccountId)).toBe(
        balanceBefore,
      );
    });

    it('keeps the generic create endpoint from creating a transfer leg', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: sourceAccountId,
          type: 'TRANSFER_OUT',
          amount: '10.00',
          currency: 'MYR',
          transactionDate: '2026-09-02',
        })
        .expect(400);
    });
  });
});
