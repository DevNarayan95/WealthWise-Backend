import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import type { AppConfig } from './app-config';

import {
  ACCESS_TOKEN_SECURITY_SCHEME,
  API_KEY_SECURITY_SCHEME,
} from '../common/decorators/api-security.decorator';

export const createSwaggerDocumentConfig = (
  swagger: AppConfig['swagger'],
  baseUrl: string,
  apiKeyHeader: string,
) =>
  new DocumentBuilder()
    .setTitle(swagger.title)
    .setDescription(swagger.description)
    .setVersion(swagger.version)
    .addServer(baseUrl)
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: apiKeyHeader,
        description:
          'Client application API key (web frontend or mobile app). Required on every API call.',
      },
      API_KEY_SECURITY_SCHEME,
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter a valid JWT access token.',
      },
      ACCESS_TOKEN_SECURITY_SCHEME,
    )
    .build();

export const setupSwagger = (
  app: INestApplication,
  swagger: AppConfig['swagger'],
  baseUrl: string,
  apiKeyHeader: string,
): void => {
  if (!swagger.enabled) {
    return;
  }

  const document = SwaggerModule.createDocument(
    app,
    createSwaggerDocumentConfig(swagger, baseUrl, apiKeyHeader),
  );

  SwaggerModule.setup(swagger.path, app, document, {
    useGlobalPrefix: false,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
};
