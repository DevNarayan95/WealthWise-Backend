import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

@Controller({
  path: 'health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  constructor(
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async check() {
    this.logger.info('Health check requested');

    await this.prisma.$queryRaw`SELECT 1;`;

    return {
      status: 'ok',
      service: 'wealthwise-backend',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}
