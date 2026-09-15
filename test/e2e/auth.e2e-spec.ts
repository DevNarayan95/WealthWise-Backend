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

  const createTestApp = async (): Promise<INestApplication> => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const testApp = moduleFixture.createNestApplication();

    testApp.setGlobalPrefix('api');

    testApp.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    testApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    testApp.useGlobalFilters(new HttpExceptionFilter());

    await testApp.init();

    return testApp;
  };

  beforeEach(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
  });

  afterEach(async () => {
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
        .expect(200);

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

    it('should reject login for an inactive user', async () => {
      const admin = await prisma.user.findUnique({
        where: {
          email: adminEmail,
        },
      });

      expect(admin).not.toBeNull();

      await prisma.user.update({
        where: { email: adminEmail },
        data: { status: 'INACTIVE' },
      });

      try {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: adminEmail,
            password: adminPassword,
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('User account is not active');
      } finally {
        await prisma.user.update({
          where: { email: adminEmail },
          data: { status: 'ACTIVE' },
        });
      }
    });

    it('should reject login for a suspended user', async () => {
      const admin = await prisma.user.findUnique({
        where: {
          email: adminEmail,
        },
      });

      expect(admin).not.toBeNull();

      await prisma.user.update({
        where: { email: adminEmail },
        data: { status: 'SUSPENDED' },
      });

      try {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: adminEmail,
            password: adminPassword,
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('User account is not active');
      } finally {
        await prisma.user.update({
          where: { email: adminEmail },
          data: { status: 'ACTIVE' },
        });
      }
    });

    it('should rate limit repeated login attempts', async () => {
      const loginRequest = () =>
        request(app.getHttpServer()).post('/api/v1/auth/login').send({
          email: 'rate-limited-user@example.com',
          password: 'WrongPassword123!',
        });

      for (let attempt = 0; attempt < 5; attempt += 1) {
        await loginRequest().expect(401);
      }

      const response = await loginRequest().expect(429);

      expect(response.body.success).toBe(false);
    });

    it('should reject a password longer than 128 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: 'A'.repeat(129),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should authenticate with a mixed-case email address', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'ADMIN@WEALTHWISE.LOCAL',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('admin@wealthwise.local');
    });

    it('should normalize email whitespace and casing during login', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: '  ADMIN@WEALTHWISE.LOCAL  ',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('admin@wealthwise.local');
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('should reject requests without an access token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject requests with an malformed access token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject a tampered access token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        })
        .expect(200);

      const accessToken = loginResponse.body.data.accessToken;

      const [header, payload, signature] = accessToken.split('.');

      const tamperedPayload = Buffer.from(
        JSON.stringify({
          sub: 'tampered-user-id',
          email: 'attacker@example.com',
        }),
      ).toString('base64url');

      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject an access token signed with the wrong secret', async () => {
      const invalidToken = jwtService.sign(
        {
          sub: 'fake-user-id',
          email: adminEmail,
        },
        {
          secret: 'wrong-secret-that-is-not-the-configured-jwt-secret',
        },
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject an expired access token', async () => {
      const expiredToken = jwtService.sign(
        {
          sub: 'expired-user-id',
          email: adminEmail,
        },
        {
          expiresIn: -1,
        },
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject an access token when the user no longer exists', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        })
        .expect(200);

      const accessToken = loginResponse.body.data.accessToken;

      const admin = await prisma.user.findUnique({
        where: { email: adminEmail },
      });

      expect(admin).not.toBeNull();

      await prisma.user.delete({
        where: { id: admin!.id },
      });

      try {
        const response = await request(app.getHttpServer())
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      } finally {
        await prisma.user.create({
          data: {
            id: admin!.id,
            email: admin!.email,
            passwordHash: admin!.passwordHash,
            firstName: admin!.firstName,
            lastName: admin!.lastName,
            status: admin!.status,
          },
        });
      }
    });

    it('should return the authenticated user with a valid access token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        })
        .expect(200);

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
    it('should contain only the authenticated user identity', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        })
        .expect(200);

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

      expect(payload).not.toHaveProperty('password');
      expect(payload).not.toHaveProperty('passwordHash');
      expect(payload).not.toHaveProperty('status');
      expect(payload).not.toHaveProperty('roles');
      expect(payload).not.toHaveProperty('permissions');
    });

    it('should include a finite expiration time in the JWT payload', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        })
        .expect(200);

      const accessToken = loginResponse.body.data.accessToken;

      const payload = jwtService.decode(accessToken) as {
        iat: number;
        exp: number;
      };

      expect(payload.iat).toEqual(expect.any(Number));
      expect(payload.exp).toEqual(expect.any(Number));

      expect(payload.exp).toBeGreaterThan(payload.iat);
    });
  });
});
