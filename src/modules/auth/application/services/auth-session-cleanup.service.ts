import { Injectable } from '@nestjs/common';

import { AuthSessionRepository } from '../../domain/repositories/auth-session.repository';

@Injectable()
export class AuthSessionCleanupService {
  constructor(private readonly authSessionRepository: AuthSessionRepository) {}

  purgeExpiredSessions(): Promise<number> {
    return this.authSessionRepository.deleteExpiredSessions(new Date());
  }
}
