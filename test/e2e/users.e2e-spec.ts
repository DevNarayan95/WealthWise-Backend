import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('Users Registration (E2E)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/users', () => {
    it('should register a new user successfully', async () => {
      const email = `e2e-${Date.now()}@example.com`;

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          email,
          password: 'Password123!',
          firstName: 'E2E',
          lastName: 'Test',
        })
        .expect(201);

      expect(response.body.success).toBe(true);

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
        .send({
          email,
          password: 'Password123!',
          firstName: 'First',
          lastName: 'User',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          email,
          password: 'Password123!',
          firstName: 'Second',
          lastName: 'User',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });
});
