import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { createAccessToken } from './support/access-token';
import { binaryParser } from './support/binary-parser';
import { Test, TestingModule } from '@nestjs/testing';
import request from './support/api-request';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';
import { AccountType, UserStatus } from '../../prisma/generated/prisma/client';

describe('Income categories (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerId: string;
  let ownerToken: string;
  let otherUserId: string;
  let otherUserToken: string;
  let noRoleUserId: string;
  let noRoleUserToken: string;
  let accountId: string;

  let systemCategoryId: string;

  const testPrefix = `income-e2e-${Date.now()}`;

  const createUserWithCustomerRole = async (
    suffix: string,
    customerRoleId: string,
  ): Promise<{ id: string; token: string }> => {
    const user = await prisma.user.create({
      data: {
        email: `${testPrefix}-${suffix}@example.com`,
        passwordHash: 'e2e-test-password-hash',
        firstName: 'Income',
        lastName: suffix,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: customerRoleId,
      },
    });

    const token = await createAccessToken(app, {
      userId: user.id,
      email: user.email,
    });

    return { id: user.id, token };
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

    const customerRole = await prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });

    if (!customerRole) {
      throw new Error('CUSTOMER role not found. Run npm run db:seed:test');
    }

    const owner = await createUserWithCustomerRole('owner', customerRole.id);
    ownerId = owner.id;
    ownerToken = owner.token;

    const other = await createUserWithCustomerRole('other', customerRole.id);
    otherUserId = other.id;
    otherUserToken = other.token;

    const noRoleUser = await prisma.user.create({
      data: {
        email: `${testPrefix}-no-role@example.com`,
        passwordHash: 'e2e-test-password-hash',
        firstName: 'Income',
        lastName: 'NoRole',
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });
    noRoleUserId = noRoleUser.id;
    noRoleUserToken = await createAccessToken(app, {
      userId: noRoleUser.id,
      email: noRoleUser.email,
    });

    const account = await prisma.account.create({
      data: {
        userId: ownerId,
        name: `${testPrefix}-account`,
        type: AccountType.BANK_ACCOUNT,
        currency: 'MYR',
        openingBalance: '0.0000',
      },
    });
    accountId = account.id;

    const systemCategory = await prisma.incomeCategory.findFirst({
      where: { userId: null, name: 'Salary' },
    });

    if (!systemCategory) {
      throw new Error(
        'System income category "Salary" not found. Run npm run db:seed:test',
      );
    }
    systemCategoryId = systemCategory.id;
  });

  afterAll(async () => {
    const userIds = [ownerId, otherUserId, noRoleUserId].filter(Boolean);

    await prisma.transaction.deleteMany({
      where: { account: { userId: { in: userIds } } },
    });
    await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userIncomeCategoryArchive.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.incomeCategory.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    await app.close();
  });

  const createCategory = (token: string, name: string) =>
    request(app.getHttpServer())
      .post('/api/v1/income/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name });

  describe('POST /api/v1/income/categories', () => {
    it('should create a custom income category for the authenticated user', async () => {
      const response = await createCategory(
        ownerToken,
        `${testPrefix}-freelance`,
      ).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: `${testPrefix}-freelance`,
          isArchived: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
      expect(response.body.data).not.toHaveProperty('userId');
    });

    it('should return 409 INCOME_CATEGORY_ALREADY_EXISTS when the name already exists case-insensitively', async () => {
      await createCategory(ownerToken, `${testPrefix}-dup`).expect(201);

      const response = await createCategory(
        ownerToken,
        `  ${testPrefix}-DUP  `,
      ).expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe('NV409');
      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'INCOME_CATEGORY_ALREADY_EXISTS' }),
      );
    });

    it('should return 409 INCOME_CATEGORY_ALREADY_EXISTS when the name matches a system category', async () => {
      const response = await createCategory(ownerToken, 'salary').expect(409);

      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'INCOME_CATEGORY_ALREADY_EXISTS' }),
      );
    });

    it('should return 400 with a NV400 envelope when the name is empty', async () => {
      const response = await createCategory(ownerToken, '').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe('NV400');
    });

    it('should return 401 when no JWT is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/income/categories')
        .send({ name: `${testPrefix}-no-token` })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe('NV401');
    });
  });

  describe('GET /api/v1/income/categories', () => {
    it('should list system categories and the user own categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/income/categories?page=1&limit=100')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const names = response.body.data.items.map(
        (item: { name: string }) => item.name,
      );

      expect(names).toContain('Salary');
      expect(names).toContain('Rental');
      expect(names).toContain('Capital Gains');
      expect(names).toContain('Interest from FD');
      expect(names).toContain(`${testPrefix}-freelance`);
      expect(response.body.meta).toEqual(
        expect.objectContaining({
          page: 1,
          limit: 100,
          total: expect.any(Number),
          totalPages: expect.any(Number),
        }),
      );
    });

    it("should not list another user's categories", async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/income/categories?page=1&limit=100')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      const names = response.body.data.items.map(
        (item: { name: string }) => item.name,
      );

      expect(names).not.toContain(`${testPrefix}-freelance`);
    });
  });

  describe('GET /api/v1/income/categories/export', () => {
    const exportRequest = (token: string, format?: string) => {
      const url = format
        ? `/api/v1/income/categories/export?format=${format}`
        : '/api/v1/income/categories/export';

      return request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${token}`);
    };

    it('should export the available income categories as a CSV attachment', async () => {
      await createCategory(ownerToken, `${testPrefix}-csv-category`).expect(
        201,
      );

      const response = await exportRequest(ownerToken, 'csv')
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toMatch(
        /^attachment; filename="navro-income-categories-\d{4}-\d{2}-\d{2}\.csv"$/,
      );
      expect(response.headers['cache-control']).toBe('no-store');

      const csv = (response.body as Buffer).toString('utf8');

      expect(csv).toContain('Name,Source,Created At,Updated At');
      expect(csv).toContain(`${testPrefix}-csv-category,Custom,`);
      expect(csv).toContain('Salary,System,');
    });

    it('should export the available income categories as a PDF attachment', async () => {
      const response = await exportRequest(ownerToken, 'pdf')
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toMatch(
        /^attachment; filename="navro-income-categories-\d{4}-\d{2}-\d{2}\.pdf"$/,
      );

      const pdf = response.body as Buffer;

      expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });

    it('should not include custom categories belonging to other users', async () => {
      await createCategory(
        otherUserToken,
        `${testPrefix}-other-user-category`,
      ).expect(201);

      const response = await exportRequest(ownerToken, 'csv')
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      const csv = (response.body as Buffer).toString('utf8');

      expect(csv).not.toContain(`${testPrefix}-other-user-category`);
    });

    it('should not include categories the user has archived', async () => {
      const created = await createCategory(
        ownerToken,
        `${testPrefix}-exported-then-archived`,
      ).expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/income/categories/${created.body.data.id}/archive`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const response = await exportRequest(ownerToken, 'csv')
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      const csv = (response.body as Buffer).toString('utf8');

      expect(csv).not.toContain(`${testPrefix}-exported-then-archived`);
    });

    it('should reject export without a format', async () => {
      const response = await exportRequest(ownerToken).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject an unsupported export format', async () => {
      const response = await exportRequest(ownerToken, 'xlsx').expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject export without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/income/categories/export?format=csv')
        .expect(401);
    });

    it('should reject export without income:read permission', async () => {
      const response = await exportRequest(noRoleUserToken, 'csv').expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/income/categories/:id', () => {
    it('should return the requested system category', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/income/categories/${systemCategoryId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.objectContaining({ id: systemCategoryId, name: 'Salary' }),
      );
    });

    it("should return 404 INCOME_CATEGORY_NOT_FOUND for another user's category", async () => {
      const owned = await createCategory(
        ownerToken,
        `${testPrefix}-private`,
      ).expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/income/categories/${owned.body.data.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe('NV404');
      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'INCOME_CATEGORY_NOT_FOUND' }),
      );
    });
  });

  describe('PATCH /api/v1/income/categories/:id', () => {
    it('should rename a custom category owned by the user', async () => {
      const created = await createCategory(
        ownerToken,
        `${testPrefix}-to-rename`,
      ).expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/income/categories/${created.body.data.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: `${testPrefix}-renamed` })
        .expect(200);

      expect(response.body.data.name).toBe(`${testPrefix}-renamed`);
    });

    it('should return 409 INCOME_CATEGORY_ALREADY_EXISTS when renaming to another own category name', async () => {
      await createCategory(ownerToken, `${testPrefix}-taken`).expect(201);
      const created = await createCategory(
        ownerToken,
        `${testPrefix}-rename-clash`,
      ).expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/income/categories/${created.body.data.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: `${testPrefix}-TAKEN` })
        .expect(409);

      expect(response.body.statusCode).toBe('NV409');
      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'INCOME_CATEGORY_ALREADY_EXISTS' }),
      );
    });

    it('should allow renaming a category to its own current name', async () => {
      const created = await createCategory(
        ownerToken,
        `${testPrefix}-same-name`,
      ).expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/income/categories/${created.body.data.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: `${testPrefix}-same-name` })
        .expect(200);

      expect(response.body.data.name).toBe(`${testPrefix}-same-name`);
    });

    it('should return 403 SYSTEM_INCOME_CATEGORY_READ_ONLY when renaming a system category', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/income/categories/${systemCategoryId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Renamed Salary' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe('NV403');
      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'SYSTEM_INCOME_CATEGORY_READ_ONLY' }),
      );
    });
  });

  describe('PATCH /api/v1/income/categories/:id/archive', () => {
    it('should archive a custom category and hide it from later reads', async () => {
      const created = await createCategory(
        ownerToken,
        `${testPrefix}-to-archive`,
      ).expect(201);
      const categoryId = created.body.data.id;

      const archived = await request(app.getHttpServer())
        .patch(`/api/v1/income/categories/${categoryId}/archive`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(archived.body.data.isArchived).toBe(true);

      const fetched = await request(app.getHttpServer())
        .get(`/api/v1/income/categories/${categoryId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(fetched.body.error.code).toBe('INCOME_CATEGORY_NOT_FOUND');
    });

    it('should hide a system category only for the user who archived it', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/income/categories/${systemCategoryId}/archive`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(systemCategoryId);
      expect(response.body.data.isArchived).toBe(true);

      await request(app.getHttpServer())
        .get(`/api/v1/income/categories/${systemCategoryId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      const otherUserView = await request(app.getHttpServer())
        .get(`/api/v1/income/categories/${systemCategoryId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(otherUserView.body.data.isArchived).toBe(false);
    });
  });

  describe('Transactions linked to income categories', () => {
    let linkedCategoryId: string;

    beforeAll(async () => {
      // A custom category is used because the archive test above hides the shared system category for the owner.
      const created = await createCategory(
        ownerToken,
        `${testPrefix}-linked`,
      ).expect(201);
      linkedCategoryId = created.body.data.id;
    });

    const transactionBody = (overrides: Record<string, unknown>) => ({
      accountId,
      amount: '1000.0000',
      currency: 'MYR',
      description: 'Monthly pay',
      transactionDate: '2026-09-01',
      ...overrides,
    });

    it('should create an INCOME transaction with a valid income category', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(
          transactionBody({
            type: 'INCOME',
            incomeCategoryId: linkedCategoryId,
          }),
        )
        .expect(201);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          type: 'INCOME',
          incomeCategoryId: linkedCategoryId,
        }),
      );
    });

    it('should return 400 INVALID_INCOME_CATEGORY when an EXPENSE carries a category', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(
          transactionBody({
            type: 'EXPENSE',
            incomeCategoryId: systemCategoryId,
          }),
        )
        .expect(400);

      expect(response.body.statusCode).toBe('NV400');
      expect(response.body.error.code).toBe('INVALID_TRANSACTION');
    });

    it("should return 404 INCOME_CATEGORY_NOT_FOUND when using another user's category", async () => {
      const privateCategory = await createCategory(
        otherUserToken,
        `${testPrefix}-other-private`,
      ).expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(
          transactionBody({
            type: 'INCOME',
            incomeCategoryId: privateCategory.body.data.id,
          }),
        )
        .expect(404);

      expect(response.body.error.code).toBe('INCOME_CATEGORY_NOT_FOUND');
    });
  });
});
