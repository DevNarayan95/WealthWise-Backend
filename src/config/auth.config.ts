import { registerAs } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN ??
    '15m') as SignOptions['expiresIn'],
}));
