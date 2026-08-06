import {
  Controller,
  Get,
  VERSION_NEUTRAL,
  NotFoundException,
} from '@nestjs/common';

@Controller({
  path: 'health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'wealthwise-backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('test-error')
  testError() {
    throw new NotFoundException('Test resource was not found');
  }
}
