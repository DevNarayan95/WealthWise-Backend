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

describe('Users Registration (E2E)', () => {
  let app: INestApplication;
  let accessToken: string;

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

    /**
     * Generate JWT for seeded Super Admin.
     * Super Admin has users:create permission.
     */
    const jwtService = app.get(JwtService);
    const prisma = app.get(PrismaService);

    const superAdmin = await prisma.user.findUnique({
      where: {
        email: 'admin@wealthwise.local',
      },
    });

    if (!superAdmin) {
      throw new Error('Super Admin user not found. Run npm run db:seed');
    }

    accessToken = await jwtService.signAsync({
      sub: superAdmin.id,
      email: superAdmin.email,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/users', () => {
    it('should register a new user successfully', async () => {
      const email = `e2e-${Date.now()}@example.com`;

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email,
          password: 'Password123!',
          firstName: 'E2E',
          lastName: 'Test',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.meta).toEqual({});

      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          email,
          firstName: 'E2E',
          lastName: 'Test',
        }),
      );

      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.passwordHash).toBeUndefined();
    });

    it('should reject registration when email is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'Password1231!',
          firstName: 'E2E',
          lastName: 'Test',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration when email is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          firstName: 'E2E',
          lastName: 'Test',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration when password is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `missing-password-${Date.now()}@example.com`,
          firstName: 'E2E',
          lastName: 'Test',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration when first name is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `missing-first-name-${Date.now()}@example.com`,
          password: 'Password123!',
          lastName: 'Test',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration when last name is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `missing-first-name-${Date.now()}@example.com`,
          password: 'Password123!',
          fristName: 'E2E',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject unexpected fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `extra-field-${Date.now()}@example.com`,
          password: 'Password123!',
          firstName: 'E2E',
          lastName: 'Test',
          role: 'admin',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email,
          password: 'Password123!',
          firstName: 'First',
          lastName: 'User',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email,
          password: 'Password123!',
          firstName: 'Second',
          lastName: 'User',
        })
        .expect(409);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          statusCode: 409,
          error: expect.objectContaining({
            code: 'USER_ALREADY_EXISTS',
            message: 'A user with this email already exists',
          }),
        }),
      );
    });
  });
});
