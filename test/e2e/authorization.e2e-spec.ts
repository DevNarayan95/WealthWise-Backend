import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';

describe('Authorization (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const adminEmail = process.env.SEED_ADMIN_EMAIL!;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD!;

  let normalUserId: string;
  let normalUserEmail: string;

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

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    normalUserEmail = `authorization-test-${Date.now()}@example.com`;

    const passwordHash = await bcrypt.hash('TestPassword123!', 12);

    const normalUser = await prisma.user.create({
      data: {
        email: normalUserEmail,
        passwordHash,
        firstName: 'Authorization',
        lastName: 'Test',
        status: 'ACTIVE',
      },
    });

    normalUserId = normalUser.id;
  });

  afterAll(async () => {
    if (normalUserId) {
      await prisma.user.delete({
        where: {
          id: normalUserId,
        },
      });
    }

    await app.close();
  });

  describe('POST /api/v1/users', () => {
    it('should allow the super admin to create a user', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        })
        .expect(201);

      const accessToken = loginResponse.body.data.accessToken;

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `created-by-admin-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          firstName: 'Created',
          lastName: 'User',
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String),
          firstName: 'Created',
          lastName: 'User',
        }),
      );

      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.passwordHash).toBeUndefined();
    });

    it('should reject an authenticated user without users:create permission', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: normalUserEmail,
          password: 'TestPassword123!',
        })
        .expect(201);

      const accessToken = loginResponse.body.data.accessToken;

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `unauthorized-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          firstName: 'Unauthorized',
          lastName: 'User',
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
      const token = await jwtService.signAsync({
        sub: normalUserId,
        email: normalUserEmail,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: `jwt-unauthorized-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          firstName: 'JWT',
          lastName: 'Unauthorized',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
