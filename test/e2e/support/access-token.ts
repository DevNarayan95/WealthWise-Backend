import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../../src/infrastructure/database/prisma/prisma.service';

const TEST_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export interface AccessTokenOptions {
  userId: string;
  email: string;
}

/**
 * Creates a live session for the user and signs an access token bound to it,
 * the same way login does. JwtStrategy rejects tokens without a live session,
 * so e2e tests must mint tokens through this helper instead of signing
 * `{ sub, email }` directly.
 */
export const createAccessToken = async (
  app: INestApplication,
  { userId, email }: AccessTokenOptions,
): Promise<string> => {
  const prisma = app.get(PrismaService);
  const jwtService = app.get(JwtService);

  const session = await prisma.authSession.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + TEST_SESSION_TTL_MS),
    },
  });

  return jwtService.signAsync({ sub: userId, email, sid: session.id });
};
