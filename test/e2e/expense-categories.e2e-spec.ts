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
import { UserStatus } from '../../prisma/generated/prisma/client';

describe('Expense categories (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerId: string;
  let ownerToken: string;
  let otherUserId: string;
  let otherUserToken: string;
  let noRoleUserId: string;
  let noRoleUserToken: string;

  let systemCategoryId: string;

  const testPrefix = `expense-e2e-${Date.now()}`;

  const createUser = async (
    suffix: string,
    roleId: string | null,
  ): Promise<{ id: string; token: string }> => {
    const user = await prisma.user.create({
      data: {
        email: `${testPrefix}-${suffix}@example.com`,
        passwordHash: 'e2e-test-password-hash',
        firstName: 'Expense',
        lastName: suffix,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    if (roleId) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId,
        },
      });
    }

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

    const owner = await createUser('owner', customerRole.id);
    ownerId = owner.id;
    ownerToken = owner.token;

    const other = await createUser('other', customerRole.id);
    otherUserId = other.id;
    otherUserToken = other.token;

    const noRole = await createUser('no-role', null);
    noRoleUserId = noRole.id;
    noRoleUserToken = noRole.token;

    const systemCategory = await prisma.expenseCategory.findFirst({
      where: { userId: null, name: 'Groceries' },
    });

    if (!systemCategory) {
      throw new Error(
        'System expense category "Groceries" not found. Run npm run db:seed:test',
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
    await prisma.userExpenseCategoryArchive.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.expenseCategory.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    await app.close();
  });

  const createCategory = (token: string, name: string) =>
    request(app.getHttpServer())
      .post('/api/v1/expenses/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name });

  describe('POST /api/v1/expenses/categories', () => {
    it('should create a custom expense category for the authenticated user', async () => {
      const response = await createCategory(
        ownerToken,
        `${testPrefix}-gym`,
      ).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: `${testPrefix}-gym`,
          isSystem: false,
          isArchived: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
      expect(response.body.data).not.toHaveProperty('userId');
    });

    it('should return 409 EXPENSE_CATEGORY_ALREADY_EXISTS when the name already exists case-insensitively', async () => {
      await createCategory(ownerToken, `${testPrefix}-dup`).expect(201);

      const response = await createCategory(
        ownerToken,
        `  ${testPrefix}-DUP  `,
      ).expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe('NV409');
      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'EXPENSE_CATEGORY_ALREADY_EXISTS' }),
      );
    });

    it('should return 409 EXPENSE_CATEGORY_ALREADY_EXISTS when the name matches a system category', async () => {
      const response = await createCategory(ownerToken, 'groceries').expect(
        409,
      );

      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'EXPENSE_CATEGORY_ALREADY_EXISTS' }),
      );
    });

    it('should return 400 with a NV400 envelope when the name is empty', async () => {
      const response = await createCategory(ownerToken, '').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe('NV400');
    });

    it('should return 401 when no JWT is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/expenses/categories')
        .send({ name: `${testPrefix}-no-token` })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe('NV401');
    });

    it('should return 403 NV403 when the user lacks the expense:create permission', async () => {
      const response = await createCategory(
        noRoleUserToken,
        `${testPrefix}-no-permission`,
      ).expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe('NV403');
    });
  });

  describe('GET /api/v1/expenses/categories', () => {
    it('should list system categories and the user own categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/expenses/categories?page=1&limit=100')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const names = response.body.data.items.map(
        (item: { name: string }) => item.name,
      );

      expect(names).toContain('Groceries');
      expect(names).toContain(`${testPrefix}-gym`);
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
        .get('/api/v1/expenses/categories?page=1&limit=100')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      const names = response.body.data.items.map(
        (item: { name: string }) => item.name,
      );

      expect(names).not.toContain(`${testPrefix}-gym`);
    });
  });

  describe('GET /api/v1/expenses/categories/export', () => {
    const exportRequest = (token: string, format?: string) => {
      const url = format
        ? `/api/v1/expenses/categories/export?format=${format}`
        : '/api/v1/expenses/categories/export';

      return request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${token}`);
    };

    it('should export the available expense categories as a CSV attachment', async () => {
      await createCategory(ownerToken, `${testPrefix}-csv-category`).expect(
        201,
      );

      const response = await exportRequest(ownerToken, 'csv')
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toMatch(
        /^attachment; filename="navro-expense-categories-\d{4}-\d{2}-\d{2}\.csv"$/,
      );
      expect(response.headers['cache-control']).toBe('no-store');

      const csv = (response.body as Buffer).toString('utf8');

      expect(csv).toContain('Name,Source,Created At,Updated At');
      expect(csv).toContain(`${testPrefix}-csv-category,Custom,`);
      expect(csv).toContain('Groceries,System,');
    });

    it('should export the available expense categories as a PDF attachment', async () => {
      const response = await exportRequest(ownerToken, 'pdf')
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toMatch(
        /^attachment; filename="navro-expense-categories-\d{4}-\d{2}-\d{2}\.pdf"$/,
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
        .patch(`/api/v1/expenses/categories/${created.body.data.id}/archive`)
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
        .get('/api/v1/expenses/categories/export?format=csv')
        .expect(401);
    });

    it('should reject export without expense:read permission', async () => {
      const response = await exportRequest(noRoleUserToken, 'csv').expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/expenses/categories/:id', () => {
    it('should return the requested system category', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/expenses/categories/${systemCategoryId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: systemCategoryId,
          name: 'Groceries',
          isSystem: true,
        }),
      );
    });

    it("should return 404 EXPENSE_CATEGORY_NOT_FOUND for another user's category", async () => {
      const owned = await createCategory(
        ownerToken,
        `${testPrefix}-private`,
      ).expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/expenses/categories/${owned.body.data.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe('NV404');
      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'EXPENSE_CATEGORY_NOT_FOUND' }),
      );
    });
  });

  describe('PATCH /api/v1/expenses/categories/:id', () => {
    it('should rename a custom category owned by the user', async () => {
      const created = await createCategory(
        ownerToken,
        `${testPrefix}-to-rename`,
      ).expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/expenses/categories/${created.body.data.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: `${testPrefix}-renamed` })
        .expect(200);

      expect(response.body.data.name).toBe(`${testPrefix}-renamed`);
    });

    it('should return 409 EXPENSE_CATEGORY_ALREADY_EXISTS when renaming to another own category name', async () => {
      await createCategory(ownerToken, `${testPrefix}-taken`).expect(201);
      const created = await createCategory(
        ownerToken,
        `${testPrefix}-rename-clash`,
      ).expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/expenses/categories/${created.body.data.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: `${testPrefix}-TAKEN` })
        .expect(409);

      expect(response.body.statusCode).toBe('NV409');
      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'EXPENSE_CATEGORY_ALREADY_EXISTS' }),
      );
    });

    it('should allow renaming a category to its own current name', async () => {
      const created = await createCategory(
        ownerToken,
        `${testPrefix}-same-name`,
      ).expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/expenses/categories/${created.body.data.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: `${testPrefix}-same-name` })
        .expect(200);

      expect(response.body.data.name).toBe(`${testPrefix}-same-name`);
    });

    it('should return 403 SYSTEM_EXPENSE_CATEGORY_READ_ONLY when renaming a system category', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/expenses/categories/${systemCategoryId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Renamed Groceries' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe('NV403');
      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'SYSTEM_EXPENSE_CATEGORY_READ_ONLY' }),
      );
    });
  });

  describe('PATCH /api/v1/expenses/categories/:id/archive', () => {
    it('should archive a custom category and hide it from later reads', async () => {
      const created = await createCategory(
        ownerToken,
        `${testPrefix}-to-archive`,
      ).expect(201);
      const categoryId = created.body.data.id;

      const archived = await request(app.getHttpServer())
        .patch(`/api/v1/expenses/categories/${categoryId}/archive`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(archived.body.data.isArchived).toBe(true);

      const fetched = await request(app.getHttpServer())
        .get(`/api/v1/expenses/categories/${categoryId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(fetched.body.error.code).toBe('EXPENSE_CATEGORY_NOT_FOUND');
    });

    it('should keep an archived category name reserved for the user', async () => {
      const created = await createCategory(
        ownerToken,
        `${testPrefix}-reserved`,
      ).expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/expenses/categories/${created.body.data.id}/archive`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const response = await createCategory(
        ownerToken,
        `${testPrefix}-RESERVED`,
      ).expect(409);

      expect(response.body.error).toEqual(
        expect.objectContaining({ code: 'EXPENSE_CATEGORY_ALREADY_EXISTS' }),
      );
    });

    it('should hide a system category only for the user who archived it', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/expenses/categories/${systemCategoryId}/archive`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(systemCategoryId);

      const ownerList = await request(app.getHttpServer())
        .get('/api/v1/expenses/categories?page=1&limit=100')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const ownerIds = ownerList.body.data.items.map(
        (item: { id: string }) => item.id,
      );
      expect(ownerIds).not.toContain(systemCategoryId);

      const otherList = await request(app.getHttpServer())
        .get('/api/v1/expenses/categories?page=1&limit=100')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      const otherIds = otherList.body.data.items.map(
        (item: { id: string }) => item.id,
      );
      expect(otherIds).toContain(systemCategoryId);
    });
  });
});
