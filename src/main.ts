import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const port = configService.get<number>('app.port', 3000);

  /**
   * Security
   */
  app.use(helmet());

  /**
   * Global API prefix
   *
   * Example:
   * /api/users
   * /api/transactions
   */
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health'],
  });

  /**
   * API versioning
   *
   * Example:
   * /api/v1/users
   * /api/v1/transactions
   */
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  /**
   * Global request validation
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /**
   * CORS
   */
  app.enableCors();

  /**
   * Graceful shutdown
   */
  app.enableShutdownHooks();

  await app.listen(port);
}
bootstrap();
