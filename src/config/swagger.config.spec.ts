import type { AppConfig } from './app-config';
import { createSwaggerDocumentConfig } from './swagger.config';

describe('createSwaggerDocumentConfig', () => {
  const swagger: AppConfig['swagger'] = {
    enabled: true,
    path: 'api/docs',
    title: 'WealthWise API',
    description: 'WealthWise backend API',
    version: '1.0.0',
  };

  it('registers the configured baseUrl as the only OpenAPI server', () => {
    const document = createSwaggerDocumentConfig(
      swagger,
      'https://api.wealthwise.local',
      'x-api-key',
    );

    expect(document.servers).toEqual([{ url: 'https://api.wealthwise.local' }]);
  });

  it('applies title, description and version from config', () => {
    const document = createSwaggerDocumentConfig(
      swagger,
      'http://localhost',
      'x-api-key',
    );

    expect(document.info.title).toBe('WealthWise API');
    expect(document.info.description).toBe('WealthWise backend API');
    expect(document.info.version).toBe('1.0.0');
  });

  it('declares the JWT bearer scheme used by protected routes', () => {
    const document = createSwaggerDocumentConfig(
      swagger,
      'http://localhost',
      'x-api-key',
    );

    expect(document.components?.securitySchemes?.['access-token']).toEqual(
      expect.objectContaining({ type: 'http', scheme: 'bearer' }),
    );
  });

  it('declares the client API key scheme using the configured header name', () => {
    const document = createSwaggerDocumentConfig(
      swagger,
      'http://localhost',
      'x-custom-key',
    );

    expect(document.components?.securitySchemes?.['api-key']).toEqual(
      expect.objectContaining({
        type: 'apiKey',
        in: 'header',
        name: 'x-custom-key',
      }),
    );
  });
});
