import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { Logger } from '@nestjs/common';

@Controller({
  path: 'health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  @Get()
  check() {
    this.logger.log('Health check requested');

    return {
      status: 'ok',
      service: 'wealthwise-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
