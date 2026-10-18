import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

import type { AppConfig } from '../config/app-config';
import { setupSwagger } from '../config/swagger.config';

/**
 * Applies the HTTP pipeline shared by the running server and the e2e tests:
 * security headers, global prefix, versioning, validation, CORS and docs.
 * Exception filters and API-key guards are registered as providers in AppModule.
 */
export const configureApp = (app: NestExpressApplication): void => {
  const configService = app.get<ConfigService<AppConfig, true>>(ConfigService);

  const appConfig = configService.getOrThrow<AppConfig['app']>('app');
  const security = configService.getOrThrow<AppConfig['security']>('security');
  const swagger = configService.getOrThrow<AppConfig['swagger']>('swagger');

  app.set('trust proxy', appConfig.trustProxy);

  app.use(helmet());

  /**
   * Health probes stay outside the API prefix so orchestrators (PM2, k8s,
   * load balancers) can reach them without a path rewrite.
   */
  app.setGlobalPrefix(appConfig.apiPrefix, {
    exclude: ['health', 'health/live', 'health/ready'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: security.cors.allowedOrigins,
    credentials: security.cors.allowCredentials,
    maxAge: security.cors.maxAgeSeconds,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Request-Id',
      security.apiKeyHeader,
    ],
    exposedHeaders: ['X-Request-Id'],
  });

  setupSwagger(app, swagger, appConfig.baseUrl);
};
