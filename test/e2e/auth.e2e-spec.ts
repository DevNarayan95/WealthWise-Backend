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

describe('Authentication (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const adminEmail = process.env.SEED_ADMIN_EMAIL!;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD!;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          user: expect.objectContaining({
            id: expect.any(String),
            email: adminEmail,
            firstName: expect.any(String),
            lastName: expect.any(String),
          }),
        }),
      );

      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject an unknown email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'unknown-user@example.com',
          password: adminPassword,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject an invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject an invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: adminPassword,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject a password shorter than 8 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: 'short',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject unexpected fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
          role: 'admin',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('should reject requests without an access token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject requests with an invalid access token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return the authenticated user with a valid access token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        })
        .expect(201);

      const accessToken = loginResponse.body.data.accessToken;

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          email: adminEmail,
          firstName: expect.any(String),
          lastName: expect.any(String),
        }),
      );

      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.passwordHash).toBeUndefined();
    });
  });

  describe('JWT payload', () => {
    it('should contain the authenticated user identity', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        })
        .expect(201);

      const accessToken = loginResponse.body.data.accessToken;

      const payload = jwtService.decode(accessToken) as {
        sub: string;
        email: string;
      };

      const admin = await prisma.user.findUnique({
        where: {
          email: adminEmail,
        },
      });

      expect(admin).not.toBeNull();

      expect(payload).toEqual(
        expect.objectContaining({
          sub: admin!.id,
          email: adminEmail,
        }),
      );
    });
  });
});
