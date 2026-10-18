import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';

import type { AppConfig } from '../../config/app-config';

@Injectable()
export class PasswordHasherService {
  private readonly saltRounds: number;

  constructor(configService: ConfigService<AppConfig, true>) {
    this.saltRounds =
      configService.getOrThrow<AppConfig['auth']>('auth').passwordSaltRounds;
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}
