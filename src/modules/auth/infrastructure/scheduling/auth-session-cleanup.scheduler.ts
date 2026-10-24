import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthSessionCleanupService } from '../../application/services/auth-session-cleanup.service';

const MS_PER_MINUTE = 60_000;

@Injectable()
export class AuthSessionCleanupScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AuthSessionCleanupScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly authSessionCleanupService: AuthSessionCleanupService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const enabled = this.configService.getOrThrow<boolean>(
      'auth.sessionCleanup.enabled',
    );

    if (!enabled) {
      return;
    }

    const intervalMinutes = this.configService.getOrThrow<number>(
      'auth.sessionCleanup.intervalMinutes',
    );

    this.timer = setInterval(() => {
      void this.purgeSafely();
    }, intervalMinutes * MS_PER_MINUTE);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async purgeSafely(): Promise<void> {
    try {
      const deleted =
        await this.authSessionCleanupService.purgeExpiredSessions();

      if (deleted > 0) {
        this.logger.log(
          `Removed ${deleted} expired auth sessions`,
          AuthSessionCleanupScheduler.name,
        );
      }
    } catch (error) {
      this.logger.error(
        'Expired auth session cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
