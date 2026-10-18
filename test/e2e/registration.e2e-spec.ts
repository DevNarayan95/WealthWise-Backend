import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from './support/api-request';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';
import {
  MailMessage,
  MailSender,
} from '../../src/infrastructure/mail/mail-sender';

class CapturingMailSender extends MailSender {
  readonly messages: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.messages.push(message);
  }

  latestCodeFor(email: string): string {
    const match = [...this.messages]
      .reverse()
      .filter((message) => message.to === email)
      .map((message) => /Your code: (\d+)/.exec(message.text))
      .find((found) => found !== null);

    if (!match) {
      throw new Error(`No OTP email captured for ${email}`);
    }

    return match[1];
  }

  messagesFor(email: string): MailMessage[] {
    return this.messages.filter((message) => message.to === email);
  }
}

describe('Registration (E2E)', () => {
  let app: INestApplication;
  let mailSender: CapturingMailSender;

  const testPrefix = `reg-e2e-${Date.now()}`;
  const emailFor = (suffix: string) => `${testPrefix}-${suffix}@example.com`;
  const password = 'Password123!';
  const newPassword = 'NewPassword456!';

  const createTestApp = async (): Promise<INestApplication> => {
    mailSender = new CapturingMailSender();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailSender)
      .useValue(mailSender)
      .compile();

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

    await testApp.init();

    return testApp;
  };

  const registerRequest = (email: string, overrides: object = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        firstName: 'Reg',
        lastName: 'User',
        ...overrides,
      });

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    const cleanupApp = await createTestApp();
    await cleanupApp.get(PrismaService).user.deleteMany({
      where: { email: { startsWith: testPrefix } },
    });
    await cleanupApp.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should create an unverified user and email a verification code', async () => {
      const email = emailFor('register-ok');

      const response = await registerRequest(email).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verificationRequired).toBe(true);
      expect(response.body.data.user.email).toBe(email);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');

      const otpMessages = mailSender.messagesFor(email);
      expect(otpMessages).toHaveLength(1);
      expect(otpMessages[0].text).toMatch(/Your code: \d{6}/);
    });

    it('should reject a duplicate email with USER_ALREADY_EXISTS', async () => {
      const email = emailFor('duplicate');

      await registerRequest(email).expect(201);
      const response = await registerRequest(email).expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_ALREADY_EXISTS');
    });

    it('should reject a password shorter than 8 characters', async () => {
      const response = await registerRequest(emailFor('short-password'), {
        password: 'short',
      }).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject unexpected fields', async () => {
      await registerRequest(emailFor('unexpected'), { role: 'ADMIN' }).expect(
        400,
      );
    });
  });

  describe('Login gate', () => {
    it('should refuse login until the email is verified', async () => {
      const email = emailFor('gate');
      await registerRequest(email).expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    it('should reject a wrong code with OTP_INVALID', async () => {
      const email = emailFor('wrong-code');
      await registerRequest(email).expect(201);

      const correct = mailSender.latestCodeFor(email);
      const wrong = correct === '000000' ? '111111' : '000000';

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ email, code: wrong })
        .expect(400);

      expect(response.body.error.code).toBe('OTP_INVALID');
    });

    it('should return the same OTP_INVALID for an unknown email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ email: emailFor('never-registered'), code: '123456' })
        .expect(400);

      expect(response.body.error.code).toBe('OTP_INVALID');
    });

    it('should verify the email, send the welcome email, and allow login', async () => {
      const email = emailFor('verify-ok');
      await registerRequest(email).expect(201);

      const code = mailSender.latestCodeFor(email);

      const verifyResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ email, code })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);

      const welcome = mailSender
        .messagesFor(email)
        .find((message) => message.subject.startsWith('Welcome to'));
      expect(welcome).toBeDefined();

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);

      expect(loginResponse.body.data.accessToken).toEqual(expect.any(String));
    });

    it('should treat verifying an already verified email as a no-op', async () => {
      const email = emailFor('reuse');
      await registerRequest(email).expect(201);

      const code = mailSender.latestCodeFor(email);

      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ email, code })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ email, code })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        mailSender
          .messagesFor(email)
          .filter((message) => message.subject.startsWith('Welcome to')),
      ).toHaveLength(1);
    });
  });

  describe('POST /api/v1/auth/resend-verification', () => {
    it('should respond with 429 OTP_RESEND_TOO_SOON within the cooldown', async () => {
      const email = emailFor('cooldown');
      await registerRequest(email).expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .send({ email })
        .expect(429);

      expect(response.body.error.code).toBe('OTP_RESEND_TOO_SOON');
    });

    it('should return the same body for an unknown email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .send({ email: emailFor('unknown-resend') })
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toEqual(expect.any(String));
    });
  });

  describe('Password reset', () => {
    it('should reset the password with an emailed code and allow login with it', async () => {
      const email = emailFor('reset-ok');
      await registerRequest(email).expect(201);

      const verifyCode = mailSender.latestCodeFor(email);
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ email, code: verifyCode })
        .expect(200);

      const forgotResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email })
        .expect(202);

      const unknownResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: emailFor('reset-unknown') })
        .expect(202);

      expect(forgotResponse.body).toEqual(unknownResponse.body);

      const resetCode = mailSender.latestCodeFor(email);

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ email, code: resetCode, newPassword })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: newPassword })
        .expect(200);
    });

    it('should reject a reset with a wrong code', async () => {
      const email = emailFor('reset-wrong');
      await registerRequest(email).expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email })
        .expect(202);

      const correct = mailSender.latestCodeFor(email);
      const wrong = correct === '000000' ? '111111' : '000000';

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ email, code: wrong, newPassword })
        .expect(400);

      expect(response.body.error.code).toBe('OTP_INVALID');
    });
  });
});
