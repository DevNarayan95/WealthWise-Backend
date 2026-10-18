import { Logger as NestLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { configureApp } from './bootstrap/configure-app';
import { readAppConfigFile } from './config/app-config';
import { buildHttpsOptions } from './config/https-options';

async function bootstrap(): Promise<void> {
  const { server } = readAppConfigFile();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    httpsOptions: buildHttpsOptions(server.ssl),
  });

  app.useLogger(app.get(Logger));

  configureApp(app);

  /**
   * Graceful shutdown: PM2 and orchestrators send SIGINT/SIGTERM and Nest
   * closes DB connections and in-flight requests before exiting.
   */
  app.enableShutdownHooks();

  await app.listen(server.port, server.host);
}

bootstrap().catch((error: unknown) => {
  new NestLogger('Bootstrap').error(
    'Failed to start application',
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
