import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import type { AppConfig } from './app-config';

export const createSwaggerDocumentConfig = (
  swagger: AppConfig['swagger'],
  baseUrl: string,
) =>
  new DocumentBuilder()
    .setTitle(swagger.title)
    .setDescription(swagger.description)
    .setVersion(swagger.version)
    .addServer(baseUrl)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter a valid JWT access token.',
      },
      'access-token',
    )
    .build();

export const setupSwagger = (
  app: INestApplication,
  swagger: AppConfig['swagger'],
  baseUrl: string,
): void => {
  if (!swagger.enabled) {
    return;
  }

  const document = SwaggerModule.createDocument(
    app,
    createSwaggerDocumentConfig(swagger, baseUrl),
  );

  SwaggerModule.setup(swagger.path, app, document, {
    useGlobalPrefix: false,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
};
